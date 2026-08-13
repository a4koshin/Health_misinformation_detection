import '../core/network/api_client.dart';
import '../models/user_model.dart';

class SettingsService {
  SettingsService({ApiClient? client}) : _client = client ?? ApiClient();

  final ApiClient _client;

  Future<Map<String, dynamic>> getProfile() {
    return _client.get('/api/settings/profile', auth: true);
  }

  Future<UserModel> updateProfile({
    required UserModel current,
    required String name,
    required String email,
  }) async {
    final data = await _client.put(
      '/api/settings/profile',
      body: {
        'name': name.trim(),
        'email': email.trim(),
      },
      auth: true,
    );
    return current.mergeSettingsProfile(data);
  }

  Future<String> uploadAvatar({
    String? filePath,
    List<int>? bytes,
    required String filename,
  }) async {
    final data = await _client.postMultipart(
      '/api/settings/avatar',
      fieldName: 'file',
      filePath: filePath,
      bytes: bytes,
      filename: filename,
      auth: true,
    );
    return '${data['avatar_url'] ?? ''}';
  }
}
