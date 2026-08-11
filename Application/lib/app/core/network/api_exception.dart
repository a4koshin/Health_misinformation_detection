class ApiException implements Exception {
  const ApiException(this.message, {this.status = 0});

  final String message;
  final int status;

  @override
  String toString() => message;
}
