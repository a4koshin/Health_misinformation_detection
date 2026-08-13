import '../core/constants/api_constants.dart';
import '../core/network/api_client.dart';
import '../core/network/api_exception.dart';
import '../core/storage/token_storage.dart';
import '../models/user_model.dart';

class AuthResult {
  const AuthResult({required this.token, required this.user});

  final String token;
  final UserModel user;
}

class AuthService {
  AuthService({ApiClient? client, TokenStorage? storage})
      : _client = client ?? ApiClient(),
        _storage = storage ?? TokenStorage();

  final ApiClient _client;
  final TokenStorage _storage;

  Future<AuthResult> login(String email, String password) async {
    final data = await _client.post(
      '/api/auth/login',
      body: {'email': email.trim(), 'password': password},
    );
    return _persistUser(data);
  }

  Future<AuthResult> register({
    required String fullName,
    required String email,
    required String password,
  }) async {
    final data = await _client.post(
      '/api/auth/register',
      body: {
        'name': fullName.trim(),
        'full_name': fullName.trim(),
        'email': email.trim(),
        'password': password,
      },
    );
    return _persistUser(data);
  }

  Future<UserModel> currentUser() async {
    final data = await _client.get('/api/auth/me', auth: true);
    return _requireUser(UserModel.fromJson(data));
  }

  Future<String> forgotPassword(String email) async {
    final data = await _client.post(
      '/api/auth/forgot-password',
      body: {'email': email.trim()},
    );
    return '${data['message'] ?? 'If that email exists, we sent a reset link.'}';
  }

  Future<void> logout() => _storage.clear();

  Future<AuthResult> _persistUser(Map<String, dynamic> data) async {
    final token = '${data['access_token'] ?? ''}';
    if (token.isEmpty) {
      throw const ApiException('Sign in failed. No access token returned.');
    }
    final user = _requireUser(UserModel.fromJson(data));
    await _storage.write(token);
    return AuthResult(token: token, user: user);
  }

  UserModel _requireUser(UserModel user) {
    if (!user.isUser) {
      throw const ApiException(
        'This app is for users only. Use the web app for admin and doctor accounts.',
      );
    }
    if (user.role.toLowerCase() != ApiConstants.userRole) {
      throw const ApiException(
        'This app is for users only. Use the web app for admin and doctor accounts.',
      );
    }
    return user;
  }
}
