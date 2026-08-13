import 'package:flutter/foundation.dart';

import '../core/network/api_exception.dart';
import '../core/storage/token_storage.dart';
import '../models/user_model.dart';
import '../services/auth_service.dart';
import '../services/settings_service.dart';

class AuthProvider extends ChangeNotifier {
  AuthProvider({
    AuthService? authService,
    SettingsService? settingsService,
    TokenStorage? storage,
  })  : _auth = authService ?? AuthService(),
        _settings = settingsService ?? SettingsService(),
        _storage = storage ?? TokenStorage();

  final AuthService _auth;
  final SettingsService _settings;
  final TokenStorage _storage;

  UserModel? user;
  bool isLoading = false;
  bool isSavingProfile = false;
  bool isRestoring = true;
  String? error;

  bool get isAuthenticated => user != null;

  Future<void> restoreSession() async {
    isRestoring = true;
    notifyListeners();
    try {
      final token = await _storage.read();
      if (token == null || token.isEmpty) {
        user = null;
        return;
      }
      user = await _auth.currentUser();
      await _refreshProfileQuietly();
    } catch (_) {
      await _storage.clear();
      user = null;
    } finally {
      isRestoring = false;
      notifyListeners();
    }
  }

  Future<void> login(String email, String password) async {
    await _run(() async {
      final result = await _auth.login(email, password);
      user = result.user;
      await _refreshProfileQuietly();
    });
  }

  Future<void> register({
    required String fullName,
    required String email,
    required String password,
  }) async {
    await _run(() async {
      final result = await _auth.register(
        fullName: fullName,
        email: email,
        password: password,
      );
      user = result.user;
      await _refreshProfileQuietly();
    });
  }

  Future<String> forgotPassword(String email) async {
    isLoading = true;
    error = null;
    notifyListeners();
    try {
      return await _auth.forgotPassword(email);
    } on ApiException catch (err) {
      error = err.message;
      rethrow;
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }

  Future<void> updateProfile({
    required String name,
    required String email,
    String? avatarPath,
    List<int>? avatarBytes,
    String? avatarFilename,
  }) async {
    final current = user;
    if (current == null) {
      throw const ApiException('You must be signed in to update your profile.');
    }

    isSavingProfile = true;
    error = null;
    notifyListeners();
    try {
      var next = current;
      if ((avatarPath != null && avatarPath.isNotEmpty) ||
          (avatarBytes != null && avatarBytes.isNotEmpty)) {
        final avatarUrl = await _settings.uploadAvatar(
          filePath: avatarPath,
          bytes: avatarBytes,
          filename: avatarFilename ?? 'avatar.jpg',
        );
        if (avatarUrl.isNotEmpty) {
          next = next.copyWith(avatarUrl: avatarUrl);
        }
      }

      next = await _settings.updateProfile(
        current: next,
        name: name,
        email: email,
      );
      user = next;
    } on ApiException catch (err) {
      error = err.message;
      rethrow;
    } finally {
      isSavingProfile = false;
      notifyListeners();
    }
  }

  Future<void> logout() async {
    await _auth.logout();
    user = null;
    error = null;
    notifyListeners();
  }

  Future<void> _refreshProfileQuietly() async {
    final current = user;
    if (current == null) return;
    try {
      final data = await _settings.getProfile();
      user = current.mergeSettingsProfile(data);
    } catch (_) {
      // Keep auth/me user if settings profile fails.
    }
  }

  Future<void> _run(Future<void> Function() action) async {
    isLoading = true;
    error = null;
    notifyListeners();
    try {
      await action();
    } on ApiException catch (err) {
      await _storage.clear();
      user = null;
      error = err.message;
      rethrow;
    } catch (_) {
      await _storage.clear();
      user = null;
      error = 'Something went wrong. Please try again.';
      throw const ApiException('Something went wrong. Please try again.');
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }
}
