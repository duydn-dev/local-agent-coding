class ChatMemoryService {
  constructor() {
    this.messages = [];
    this.maxMessages = 20;
  }

  addMessage(role, content) {
    this.messages.push({
      id: Date.now(),
      role,
      content,
      createdAt: new Date()
    });

    if (this.messages.length > this.maxMessages) {
      this.messages = this.messages.slice(-this.maxMessages);
    }
  }

  getMessages() {
    return this.messages.map((x) => ({
      role: x.role,
      content: x.content
    }));
  }

  clear() {
    this.messages = [];
  }
}

module.exports = new ChatMemoryService();

