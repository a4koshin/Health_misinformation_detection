class ApiException implements Exception {
  const ApiException(
    this.message, {
    this.status = 0,
    this.paymentOutcome,
  });

  final String message;
  final int status;
  final String? paymentOutcome;

  @override
  String toString() => message;
}
