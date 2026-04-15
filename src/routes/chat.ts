import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { ChatController } from '../controllers/chatController';

const router = Router();

// GET /api/chat/contacts - list distinct users the authenticated user has exchanged messages with
router.get('/contacts', authenticate, ChatController.getContacts);

// GET /api/chat/messages/:contactId - paginated message history between two users
router.get('/messages/:contactId', authenticate, ChatController.getMessages);

// POST /api/chat/messages - send a message
router.post('/messages', authenticate, ChatController.sendMessage);

// PUT /api/chat/messages/:contactId/read - mark messages as read
router.put('/messages/:contactId/read', authenticate, ChatController.markMessagesAsRead);

// GET /api/chat/unread-count - get unread message count
router.get('/unread-count', authenticate, ChatController.getUnreadMessageCount);

export default router;
