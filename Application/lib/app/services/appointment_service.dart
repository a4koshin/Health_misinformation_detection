import '../core/network/api_client.dart';
import '../models/appointment_model.dart';

class AppointmentService {
  AppointmentService({ApiClient? client}) : _client = client ?? ApiClient();

  final ApiClient _client;

  Future<List<AppointmentModel>> listMine() async {
    final data = await _client.get('/api/appointments', auth: true);
    final items = data['items'];
    if (items is! List) return [];
    return items
        .whereType<Map>()
        .map(
          (item) => AppointmentModel.fromJson(Map<String, dynamic>.from(item)),
        )
        .toList();
  }

  Future<List<AvailabilitySlot>> listAvailability(String doctorUserId) async {
    final data = await _client.get(
      '/api/appointments/availability?doctor_user_id=$doctorUserId',
      auth: true,
    );
    final items = data['items'];
    if (items is! List) return [];
    return items
        .whereType<Map>()
        .map(
          (item) => AvailabilitySlot.fromJson(Map<String, dynamic>.from(item)),
        )
        .toList();
  }

  Future<Map<String, dynamic>> paymentConfig() async {
    final data = await _client.get(
      '/api/appointments/payment-config',
      auth: true,
    );
    return Map<String, dynamic>.from(data);
  }

  Future<AppointmentModel> book({
    required String predictionId,
    required String availabilityId,
    String? note,
    String? payerPhone,
  }) async {
    final data = await _client.post(
      '/api/appointments',
      auth: true,
      // EVC Plus USSD prompt can take up to ~2 minutes.
      timeout: const Duration(seconds: 130),
      body: {
        'prediction_id': predictionId,
        'availability_id': availabilityId,
        if (note != null && note.trim().isNotEmpty) 'note': note.trim(),
        if (payerPhone != null && payerPhone.trim().isNotEmpty)
          'payer_phone': payerPhone.trim(),
      },
    );
    return AppointmentModel.fromJson(data);
  }
}
