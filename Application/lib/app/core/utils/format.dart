String formatDateTime(DateTime? value) {
  if (value == null) return '—';
  final local = value.toLocal();
  String two(int n) => n.toString().padLeft(2, '0');
  return '${local.year}-${two(local.month)}-${two(local.day)} ${two(local.hour)}:${two(local.minute)}';
}

String formatSlotTime(DateTime value) {
  final local = value.toLocal();
  String two(int n) => n.toString().padLeft(2, '0');
  return '${two(local.hour)}:${two(local.minute)}';
}

const _weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const _months = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

DateTime slotDay(DateTime value) {
  final local = value.toLocal();
  return DateTime(local.year, local.month, local.day);
}

String formatSlotWeekday(DateTime value) =>
    _weekdays[value.toLocal().weekday - 1];

String formatSlotMonth(DateTime value) => _months[value.toLocal().month - 1];

String formatSlotDate(DateTime value) {
  final local = value.toLocal();
  return '${_weekdays[local.weekday - 1]}, ${local.day} ${_months[local.month - 1]}';
}

String formatSlotDuration(DateTime startsAt, DateTime endsAt) {
  final duration = endsAt.difference(startsAt);
  final hours = duration.inHours;
  final minutes = duration.inMinutes.remainder(60);
  if (hours > 0 && minutes > 0) return '${hours}h ${minutes}m';
  if (hours > 0) return '${hours}h';
  return '${minutes}m';
}

String formatSlotRange(DateTime? startsAt, DateTime? endsAt) {
  if (startsAt == null) return '—';
  final date = formatSlotDate(startsAt);
  final start = formatSlotTime(startsAt);
  if (endsAt == null) return '$date · $start';
  return '$date · $start – ${formatSlotTime(endsAt)}';
}
