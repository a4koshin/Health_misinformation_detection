import 'package:flutter/foundation.dart';

import '../core/network/api_exception.dart';
import '../core/storage/token_storage.dart';
import '../models/user_model.dart';
import '../services/auth_service.dart';

class AuthProvider extends ChangeNotifier {
  AuthProvider({AuthService? authService, TokenStorage? storage})
      : _auth = authService ?? AuthService(),
        _storage = storage ?? TokenStorage();

  final AuthService _auth;
  final TokenStorage _storage;

  UserModel? user;
  bool isLoading = false;
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

  Future<void> logout() async {
    await _auth.logout();
    user = null;
    error = null;
    notifyListeners();
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
