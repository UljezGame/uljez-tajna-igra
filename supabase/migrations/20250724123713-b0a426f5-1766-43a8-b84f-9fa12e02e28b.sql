-- Create plant_tokens table to track user tokens
CREATE TABLE public.plant_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tokens_count INTEGER NOT NULL DEFAULT 4,
  last_refresh_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.plant_tokens ENABLE ROW LEVEL SECURITY;

-- Create policies for plant_tokens
CREATE POLICY "Users can view their own tokens" 
ON public.plant_tokens 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tokens" 
ON public.plant_tokens 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tokens" 
ON public.plant_tokens 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create plant_actions table to track what users have planted
CREATE TABLE public.plant_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  partija_kod TEXT NOT NULL,
  plant_type TEXT NOT NULL CHECK (plant_type IN ('word', 'impostor')),
  plant_value TEXT, -- for words, this is the custom word; for impostor, this is the target username
  tokens_used INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.plant_actions ENABLE ROW LEVEL SECURITY;

-- Create policies for plant_actions
CREATE POLICY "Users can view their own plant actions" 
ON public.plant_actions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own plant actions" 
ON public.plant_actions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create function to refresh daily tokens
CREATE OR REPLACE FUNCTION public.refresh_daily_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Update tokens for users who haven't refreshed today
  UPDATE public.plant_tokens 
  SET tokens_count = 4, 
      last_refresh_date = CURRENT_DATE,
      updated_at = now()
  WHERE last_refresh_date < CURRENT_DATE;
  
  -- Insert tokens for new users who don't have an entry yet
  INSERT INTO public.plant_tokens (user_id, tokens_count, last_refresh_date)
  SELECT u.id, 4, CURRENT_DATE
  FROM auth.users u
  LEFT JOIN public.plant_tokens pt ON pt.user_id = u.id
  WHERE pt.user_id IS NULL;
END;
$$;

-- Create function to get user tokens (auto-refresh and create if needed)
CREATE OR REPLACE FUNCTION public.get_user_tokens()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  user_tokens INTEGER;
BEGIN
  -- First refresh daily tokens
  PERFORM public.refresh_daily_tokens();
  
  -- Get user's current tokens
  SELECT tokens_count INTO user_tokens
  FROM public.plant_tokens
  WHERE user_id = auth.uid();
  
  -- If user doesn't exist, create entry and return 4
  IF user_tokens IS NULL THEN
    INSERT INTO public.plant_tokens (user_id, tokens_count, last_refresh_date)
    VALUES (auth.uid(), 4, CURRENT_DATE);
    RETURN 4;
  END IF;
  
  RETURN user_tokens;
END;
$$;

-- Create function to use tokens
CREATE OR REPLACE FUNCTION public.use_plant_token(
  party_code TEXT,
  plant_type TEXT,
  plant_value TEXT DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_tokens INTEGER;
BEGIN
  -- Get current tokens
  SELECT public.get_user_tokens() INTO current_tokens;
  
  -- Check if user has enough tokens
  IF current_tokens < 1 THEN
    RETURN json_build_object('success', false, 'message', 'Not enough tokens');
  END IF;
  
  -- Validate plant_type
  IF plant_type NOT IN ('word', 'impostor') THEN
    RETURN json_build_object('success', false, 'message', 'Invalid plant type');
  END IF;
  
  -- Use token
  UPDATE public.plant_tokens 
  SET tokens_count = tokens_count - 1,
      updated_at = now()
  WHERE user_id = auth.uid();
  
  -- Record the plant action
  INSERT INTO public.plant_actions (user_id, partija_kod, plant_type, plant_value, tokens_used)
  VALUES (auth.uid(), party_code, plant_type, plant_value, 1);
  
  RETURN json_build_object('success', true, 'message', 'Plant successful', 'remaining_tokens', current_tokens - 1);
END;
$$;