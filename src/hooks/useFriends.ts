import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Friend {
  friend_username: string;
  friend_user_id: string;
  current_party_code: string | null;
}

interface FriendRequest {
  id: string;
  sender_user_id: string;
  receiver_user_id: string;
  status: string;
  created_at: string;
  sender_username?: string;
  receiver_username?: string;
}

export const useFriends = () => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchFriends = async () => {
    try {
      const { data, error } = await supabase.rpc('get_user_friends');
      if (error) throw error;
      setFriends(data || []);
    } catch (error) {
      console.error('Error fetching friends:', error);
    }
  };

  const fetchFriendRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('friend_requests')
        .select(`
          *,
          sender:profiles!friend_requests_sender_user_id_fkey(username),
          receiver:profiles!friend_requests_receiver_user_id_fkey(username)
        `)
        .eq('status', 'pending');
      
      if (error) throw error;
      
      const formattedRequests = data?.map((req: any) => ({
        ...req,
        sender_username: req.sender?.username,
        receiver_username: req.receiver?.username
      })) || [];
      
      setFriendRequests(formattedRequests);
    } catch (error) {
      console.error('Error fetching friend requests:', error);
    }
  };

  const sendFriendRequest = async (username: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('send_friend_request', {
        receiver_username: username
      });
      
      if (error) throw error;
      
      const result = data as { success: boolean; message: string };
      if (result.success) {
        toast.success(result.message);
        await fetchFriendRequests();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Failed to send friend request');
      console.error('Error sending friend request:', error);
    } finally {
      setLoading(false);
    }
  };

  const acceptFriendRequest = async (senderUsername: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('accept_friend_request', {
        sender_username: senderUsername
      });
      
      if (error) throw error;
      
      const result = data as { success: boolean; message: string };
      if (result.success) {
        toast.success(result.message);
        await Promise.all([fetchFriends(), fetchFriendRequests()]);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Failed to accept friend request');
      console.error('Error accepting friend request:', error);
    } finally {
      setLoading(false);
    }
  };

  const rejectFriendRequest = async (requestId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('friend_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId);
      
      if (error) throw error;
      
      toast.success('Friend request rejected');
      await fetchFriendRequests();
    } catch (error) {
      toast.error('Failed to reject friend request');
      console.error('Error rejecting friend request:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFriends();
    fetchFriendRequests();
  }, []);

  return {
    friends,
    friendRequests,
    loading,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    refreshFriends: fetchFriends,
    refreshFriendRequests: fetchFriendRequests
  };
};