export interface Conversation {
    id: string
    visitor_id: string
    maker_id: string
    last_message_preview: string | null
    unread_count_visitor: number
    unread_count_maker: number
    created_at: string
    updated_at: string
}

export interface Message {
    id: string
    conversation_id: string
    sender_id: string
    body: string
    created_at: string
    delivered_at: string | null
    read_at: string | null
    pending?: boolean
    failed?: boolean
    liked_by?: string[]
}

export interface InboxItem {
    conversation_id: string
    maker_id: string
    visitor_id: string
    maker_name: string
    maker_avatar_url: string | null
    visitor_name: string | null
    last_message_preview: string | null
    unread_count: number
    updated_at: string
}
