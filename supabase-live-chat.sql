-- =============================================
-- LIVE CHAT SUPPORT SYSTEM
-- Real-time chat for customer support
-- =============================================

-- Support Conversations Table
CREATE TABLE IF NOT EXISTS support_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    user_name TEXT,
    user_email TEXT,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'waiting', 'resolved', 'closed')),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    subject TEXT,
    assigned_to UUID REFERENCES auth.users(id),
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    unread_count_user INT DEFAULT 0,
    unread_count_admin INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Support Messages Table
CREATE TABLE IF NOT EXISTS support_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES support_conversations(id) ON DELETE CASCADE,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'admin', 'system')),
    sender_id UUID REFERENCES auth.users(id),
    sender_name TEXT,
    message TEXT NOT NULL,
    attachments JSONB DEFAULT '[]',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_support_conversations_user ON support_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_support_conversations_status ON support_conversations(status);
CREATE INDEX IF NOT EXISTS idx_support_conversations_updated ON support_conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_messages_conversation ON support_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_created ON support_messages(created_at DESC);

-- Enable Row Level Security
ALTER TABLE support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for support_conversations
-- Users can see their own conversations
CREATE POLICY "Users can view own conversations" ON support_conversations
    FOR SELECT USING (auth.uid() = user_id);

-- Users can create new conversations
CREATE POLICY "Users can create conversations" ON support_conversations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own conversations (close them)
CREATE POLICY "Users can update own conversations" ON support_conversations
    FOR UPDATE USING (auth.uid() = user_id);

-- Admins can view all conversations
CREATE POLICY "Admins can view all conversations" ON support_conversations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND (role = 'admin' OR role = 'support')
        )
    );

-- RLS Policies for support_messages
-- Users can see messages in their conversations
CREATE POLICY "Users can view messages in own conversations" ON support_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM support_conversations 
            WHERE id = conversation_id 
            AND user_id = auth.uid()
        )
    );

-- Users can send messages to their conversations
CREATE POLICY "Users can send messages to own conversations" ON support_messages
    FOR INSERT WITH CHECK (
        sender_type = 'user' AND
        sender_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM support_conversations 
            WHERE id = conversation_id 
            AND user_id = auth.uid()
        )
    );

-- Admins can view and send all messages
CREATE POLICY "Admins can manage all messages" ON support_messages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND (role = 'admin' OR role = 'support')
        )
    );

-- Enable Realtime for these tables
ALTER PUBLICATION supabase_realtime ADD TABLE support_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE support_messages;

-- Function to update conversation on new message
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE support_conversations
    SET 
        last_message_at = NOW(),
        updated_at = NOW(),
        unread_count_user = CASE 
            WHEN NEW.sender_type = 'admin' THEN unread_count_user + 1 
            ELSE unread_count_user 
        END,
        unread_count_admin = CASE 
            WHEN NEW.sender_type = 'user' THEN unread_count_admin + 1 
            ELSE unread_count_admin 
        END,
        status = CASE 
            WHEN NEW.sender_type = 'user' AND status = 'resolved' THEN 'open'
            WHEN NEW.sender_type = 'admin' AND status = 'open' THEN 'waiting'
            ELSE status
        END
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for message updates
DROP TRIGGER IF EXISTS on_support_message_created ON support_messages;
CREATE TRIGGER on_support_message_created
    AFTER INSERT ON support_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_on_message();

-- Function to mark messages as read
CREATE OR REPLACE FUNCTION mark_messages_read(p_conversation_id UUID, p_reader_type TEXT)
RETURNS VOID AS $$
BEGIN
    -- Mark messages as read
    UPDATE support_messages
    SET is_read = TRUE
    WHERE conversation_id = p_conversation_id
    AND sender_type != p_reader_type
    AND is_read = FALSE;
    
    -- Reset unread count
    IF p_reader_type = 'user' THEN
        UPDATE support_conversations
        SET unread_count_user = 0
        WHERE id = p_conversation_id;
    ELSE
        UPDATE support_conversations
        SET unread_count_admin = 0
        WHERE id = p_conversation_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION mark_messages_read TO authenticated;

-- View for admin dashboard
CREATE OR REPLACE VIEW support_dashboard AS
SELECT 
    sc.*,
    (SELECT COUNT(*) FROM support_messages WHERE conversation_id = sc.id) as message_count,
    (SELECT message FROM support_messages WHERE conversation_id = sc.id ORDER BY created_at DESC LIMIT 1) as last_message
FROM support_conversations sc
ORDER BY 
    CASE status 
        WHEN 'open' THEN 1 
        WHEN 'waiting' THEN 2 
        WHEN 'resolved' THEN 3 
        WHEN 'closed' THEN 4 
    END,
    last_message_at DESC;
