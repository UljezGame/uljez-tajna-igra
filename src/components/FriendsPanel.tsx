import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, UserPlus, Check, X, LogIn } from 'lucide-react';
import { useFriends } from '@/hooks/useFriends';
import { supabase } from '@/integrations/supabase/client';

interface FriendsPanelProps {
  onJoinParty: (partyCode: string) => void;
  isGuest: boolean;
}

export const FriendsPanel = ({ onJoinParty, isGuest }: FriendsPanelProps) => {
  const [friendUsername, setFriendUsername] = useState('');
  const { 
    friends, 
    friendRequests, 
    loading, 
    sendFriendRequest, 
    acceptFriendRequest, 
    rejectFriendRequest 
  } = useFriends();

  // Get current user to filter friend requests
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getCurrentUser();
  }, []);

  const handleSendRequest = async () => {
    if (!friendUsername.trim()) return;
    await sendFriendRequest(friendUsername.trim());
    setFriendUsername('');
  };

  if (isGuest) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Friends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            Register or login to use friend features
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Friends
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Friend */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="Enter username"
              value={friendUsername}
              onChange={(e) => setFriendUsername(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendRequest()}
            />
            <Button 
              onClick={handleSendRequest} 
              disabled={loading || !friendUsername.trim()}
              size="sm"
            >
              <UserPlus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Friend Requests */}
        {friendRequests.filter(req => req.receiver_user_id === currentUserId).length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Friend Requests</h4>
            {friendRequests.filter(req => req.receiver_user_id === currentUserId).map((request) => (
              <div key={request.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">
                  {request.sender_username} wants to be your friend
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => acceptFriendRequest(request.sender_username!)}
                    disabled={loading}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => rejectFriendRequest(request.id)}
                    disabled={loading}
                    className="border-red-600 text-red-600 hover:bg-red-50"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Decline
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Friends List */}
        {friends.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Friends</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {friends.map((friend) => (
                <div key={friend.friend_user_id} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {friend.friend_username}
                    </span>
                    {friend.current_party_code && (
                      <Badge variant="secondary" className="text-xs">
                        In Party
                      </Badge>
                    )}
                  </div>
                  {friend.current_party_code && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onJoinParty(friend.current_party_code!)}
                    >
                      <LogIn className="h-3 w-3 mr-1" />
                      Join
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {friends.length === 0 && friendRequests.filter(req => req.receiver_user_id === currentUserId).length === 0 && (
          <p className="text-muted-foreground text-center py-4 text-sm">
            No friends yet. Add some friends to see them here!
          </p>
        )}
      </CardContent>
    </Card>
  );
};