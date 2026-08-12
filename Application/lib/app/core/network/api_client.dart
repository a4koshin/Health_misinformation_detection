import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import '../constants/api_constants.dart';
import '../storage/token_storage.dart';
import 'api_exception.dart';

class ApiClient {
  ApiClient({http.Client? client, TokenStorage? storage})
      : _client = client ?? http.Client(),
        _storage = storage ?? TokenStorage();

  final http.Client _client;
  final TokenStorage _storage;

  Future<Map<String, dynamic>> get(
    String path, {
    bool auth = false,
    Duration? timeout,
  }) {
    return _send('GET', path, auth: auth, timeout: timeout);
  }

  Future<Map<String, dynamic>> post(
    String path, {
    Map<String, dynamic>? body,
    bool auth = false,
    Duration? timeout,
  }) {
    return _send('POST', path, body: body, auth: auth, timeout: timeout);
  }

  Future<Map<String, dynamic>> postMultipart(
    String path, {
    required String fieldName,
    String? filePath,
    List<int>? bytes,
    String? filename,
    bool auth = false,
  }) async {
    if ((filePath == null || filePath.isEmpty) && bytes == null) {
      throw const ApiException('No file was selected.');
    }

    final uri = Uri.parse('${ApiConstants.baseUrl}$path');
    final request = http.MultipartRequest('POST', uri);
    request.headers['Accept'] = 'application/json';

    if (auth) {
      final token = await _storage.read();
      if (token != null && token.isNotEmpty) {
        request.headers['Authorization'] = 'Bearer $token';
      }
    }

    if (bytes != null) {
      request.files.add(
        http.MultipartFile.fromBytes(
          fieldName,
          bytes,
          filename: filename ?? 'dataset.csv',
        ),
      );
    } else {
      request.files.add(
        await http.MultipartFile.fromPath(
          fieldName,
          filePath!,
          filename: filename,
        ),
      );
    }

    try {
      final streamed = await _client.send(request).timeout(
            const Duration(seconds: 120),
          );
      final response = await http.Response.fromStream(streamed);
      return _decodeResponse(response);
    } on SocketException {
      throw ApiException(
        'Cannot reach the server. Start the backend on ${ApiConstants.baseUrl}.',
      );
    } on HttpException {
      throw ApiException(
        'Cannot reach the server. Start the backend on ${ApiConstants.baseUrl}.',
      );
    } on FormatException {
      throw const ApiException('The server returned an unexpected response.');
    } catch (error) {
      if (error is ApiException) rethrow;
      throw ApiException(
        'Cannot reach the server. Start the backend on ${ApiConstants.baseUrl}.',
      );
    }
  }

  Future<Map<String, dynamic>> _send(
    String method,
    String path, {
    Map<String, dynamic>? body,
    bool auth = false,
    Duration? timeout,
  }) async {
    final uri = Uri.parse('${ApiConstants.baseUrl}$path');
    final headers = <String, String>{
      'Accept': 'application/json',
      if (body != null) 'Content-Type': 'application/json',
    };

    if (auth) {
      final token = await _storage.read();
      if (token != null && token.isNotEmpty) {
        headers['Authorization'] = 'Bearer $token';
      }
    }

    http.Response response;
    try {
      final request = http.Request(method, uri)
        ..headers.addAll(headers)
        ..body = body == null ? '' : jsonEncode(body);
      final streamed = await _client.send(request).timeout(
            timeout ?? const Duration(seconds: 30),
          );
      response = await http.Response.fromStream(streamed);
    } on SocketException {
      throw ApiException(
        'Cannot reach the server. Start the backend on ${ApiConstants.baseUrl}.',
      );
    } on HttpException {
      throw ApiException(
        'Cannot reach the server. Start the backend on ${ApiConstants.baseUrl}.',
      );
    } on FormatException {
      throw const ApiException('The server returned an unexpected response.');
    } catch (error) {
      if (error is ApiException) rethrow;
      throw ApiException(
        'Cannot reach the server. Start the backend on ${ApiConstants.baseUrl}.',
      );
    }

    return _decodeResponse(response);
  }

  Map<String, dynamic> _decodeResponse(http.Response response) {
    if (response.statusCode == 204) return {};

    dynamic decoded = {};
    if (response.body.isNotEmpty) {
      decoded = jsonDecode(response.body);
    }

    Map<String, dynamic> data;
    if (decoded is Map<String, dynamic>) {
      data = decoded;
    } else if (decoded is List) {
      data = {'items': decoded};
    } else {
      data = {};
    }

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw ApiException(
        _messageFrom(data, response.statusCode),
        status: response.statusCode,
      );
    }

    return data;
  }

  String _messageFrom(Map<String, dynamic> data, int status) {
    final message = data['message'];
    if (message is String && message.isNotEmpty) return message;
    final detail = data['detail'];
    if (detail is String && detail.isNotEmpty) return detail;
    return 'Request failed ($status).';
  }
}
