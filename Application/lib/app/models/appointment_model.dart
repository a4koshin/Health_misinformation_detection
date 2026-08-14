class AppointmentModel {
  const AppointmentModel({
    required this.id,
    required this.predictionId,
    required this.status,
    this.doctorName,
    this.note,
    this.startsAt,
    this.endsAt,
  });

  final String id;
  final String predictionId;
  final String status;
  final String? doctorName;
  final String? note;
  final DateTime? startsAt;
  final DateTime? endsAt;

  bool get isPending => status == 'pending';
  bool get isConfirmed => status == 'confirmed';
  bool get isActive => isPending || isConfirmed;

  factory AppointmentModel.fromJson(Map<String, dynamic> json) {
    return AppointmentModel(
      id: '${json['id'] ?? ''}',
      predictionId: '${json['prediction_id'] ?? ''}',
      status: '${json['status'] ?? 'pending'}',
      doctorName: json['doctor_name'] as String?,
      note: json['note'] as String?,
      startsAt: DateTime.tryParse('${json['starts_at'] ?? ''}'),
      endsAt: DateTime.tryParse('${json['ends_at'] ?? ''}'),
    );
  }
}

class AvailabilitySlot {
  const AvailabilitySlot({
    required this.id,
    required this.startsAt,
    required this.endsAt,
    this.booked = false,
  });

  final String id;
  final DateTime startsAt;
  final DateTime endsAt;
  final bool booked;

  factory AvailabilitySlot.fromJson(Map<String, dynamic> json) {
    return AvailabilitySlot(
      id: '${json['id'] ?? ''}',
      startsAt: DateTime.parse('${json['starts_at']}'),
      endsAt: DateTime.parse('${json['ends_at']}'),
      booked: json['booked'] == true,
    );
  }
}
