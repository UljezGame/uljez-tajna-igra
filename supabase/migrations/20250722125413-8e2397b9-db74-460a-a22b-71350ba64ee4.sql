-- Create friends and friend requests tables
CREATE TABLE public.friend_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_user_id UUID NOT NULL,
  receiver_user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(sender_user_id, receiver_user_id)
);

CREATE TABLE public.friends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user1_id UUID NOT NULL,
  user2_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user1_id, user2_id),
  CHECK (user1_id < user2_id) -- Ensure consistent ordering
);

-- Enable RLS
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;

-- RLS Policies for friend_requests
CREATE POLICY "Users can view their own friend requests" 
ON public.friend_requests 
FOR SELECT 
USING (auth.uid() = sender_user_id OR auth.uid() = receiver_user_id);

CREATE POLICY "Users can send friend requests" 
ON public.friend_requests 
FOR INSERT 
WITH CHECK (auth.uid() = sender_user_id);

CREATE POLICY "Users can update their received requests" 
ON public.friend_requests 
FOR UPDATE 
USING (auth.uid() = receiver_user_id);

-- RLS Policies for friends
CREATE POLICY "Users can view their friendships" 
ON public.friends 
FOR SELECT 
USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "System can create friendships" 
ON public.friends 
FOR INSERT 
WITH CHECK (true);

-- Functions for friend operations
CREATE OR REPLACE FUNCTION public.send_friend_request(receiver_username TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  receiver_id UUID;
  result JSON;
BEGIN
  -- Get receiver user_id from username
  SELECT user_id INTO receiver_id 
  FROM public.profiles 
  WHERE username = receiver_username;
  
  IF receiver_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'User not found');
  END IF;
  
  IF receiver_id = auth.uid() THEN
    RETURN json_build_object('success', false, 'message', 'Cannot send friend request to yourself');
  END IF;
  
  -- Check if already friends
  IF EXISTS (
    SELECT 1 FROM public.friends 
    WHERE (user1_id = LEAST(auth.uid(), receiver_id) AND user2_id = GREATEST(auth.uid(), receiver_id))
  ) THEN
    RETURN json_build_object('success', false, 'message', 'Already friends');
  END IF;
  
  -- Insert friend request
  INSERT INTO public.friend_requests (sender_user_id, receiver_user_id)
  VALUES (auth.uid(), receiver_id)
  ON CONFLICT (sender_user_id, receiver_user_id) 
  DO UPDATE SET created_at = now(), status = 'pending';
  
  RETURN json_build_object('success', true, 'message', 'Friend request sent');
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_friend_request(sender_username TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  sender_id UUID;
BEGIN
  -- Get sender user_id from username
  SELECT user_id INTO sender_id 
  FROM public.profiles 
  WHERE username = sender_username;
  
  IF sender_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'User not found');
  END IF;
  
  -- Update friend request status
  UPDATE public.friend_requests 
  SET status = 'accepted' 
  WHERE sender_user_id = sender_id AND receiver_user_id = auth.uid() AND status = 'pending';
  
  -- Create friendship
  INSERT INTO public.friends (user1_id, user2_id)
  VALUES (LEAST(sender_id, auth.uid()), GREATEST(sender_id, auth.uid()))
  ON CONFLICT DO NOTHING;
  
  RETURN json_build_object('success', true, 'message', 'Friend request accepted');
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_friends()
RETURNS TABLE(friend_username TEXT, friend_user_id UUID, current_party_code TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.username as friend_username,
    p.user_id as friend_user_id,
    i.partija_kod as current_party_code
  FROM public.friends f
  JOIN public.profiles p ON (
    CASE 
      WHEN f.user1_id = auth.uid() THEN p.user_id = f.user2_id
      ELSE p.user_id = f.user1_id
    END
  )
  LEFT JOIN public.igraci i ON i.nadimak = p.username
  WHERE f.user1_id = auth.uid() OR f.user2_id = auth.uid();
END;
$$;