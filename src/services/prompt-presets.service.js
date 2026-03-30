class PromptPresetsService {
  constructor() {
    this.presets = {
      explain_file: {
        label: 'Giải thích file',
        prompt: 'Giải thích kiến trúc file hiện tại, trách nhiệm, và các luồng chính.'
      },
      fix_bug: {
        label: 'Sửa lỗi',
        prompt: 'Phân tích file hiện tại và log gần đây, xác định lỗi và đề xuất cách sửa an toàn.'
      },
      refactor_service: {
        label: 'Refactor service',
        prompt: 'Refactor service hiện tại để dễ đọc, dễ bảo trì hơn và phù hợp clean architecture.'
      },
      generate_api: {
        label: 'Tạo API',
        prompt: 'Tạo một REST API endpoint mới dựa trên cấu trúc module hiện tại.'
      },
      generate_test: {
        label: 'Tạo Unit Test',
        prompt: 'Tạo unit test với các kịch bản thành công và thất bại phổ biến.'
      }
    };
  }

  getAll() {
    return this.presets;
  }

  get(key) {
    return this.presets[key];
  }
}

module.exports = new PromptPresetsService();

