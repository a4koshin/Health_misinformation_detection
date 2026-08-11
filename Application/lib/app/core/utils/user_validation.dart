final _nameAllowed = RegExp(
  r"^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ .'-]*[A-Za-zÀ-ÿ]$|^[A-Za-zÀ-ÿ]$",
);
final _emailPattern = RegExp(
  r'^[A-Za-z0-9](?:[A-Za-z0-9._%+-]*[A-Za-z0-9])?@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$',
);

int _letterCount(String value) {
  return value.runes.where((code) {
    final char = String.fromCharCode(code);
    return RegExp(r'\p{L}', unicode: true).hasMatch(char);
  }).length;
}

String? validateFullName(String name, {bool required = true}) {
  final cleaned = name.trim().replaceAll(RegExp(r'\s+'), ' ');
  if (cleaned.isEmpty) {
    return required ? 'Full name is required.' : null;
  }
  if (cleaned.length < 2) {
    return 'Enter a real full name, not a short code.';
  }
  final withoutMarks = cleaned.replaceAll(RegExp(r"[ .'-]"), '');
  if (RegExp(r'^\d+$').hasMatch(withoutMarks) || _letterCount(cleaned) < 2) {
    return 'Full name must contain letters, not only numbers.';
  }
  if (!_nameAllowed.hasMatch(cleaned)) {
    return 'Full name can only include letters, spaces, hyphens, and apostrophes.';
  }
  return null;
}

String? validateEmailAddress(String email) {
  final value = email.trim().toLowerCase();
  if (value.isEmpty) return 'Email is required.';
  if (value.contains('..') || !_emailPattern.hasMatch(value)) {
    return 'Enter a valid email address.';
  }
  final local = value.split('@').first;
  final localCore = local.replaceAll(RegExp(r'[._%+-]'), '');
  if (RegExp(r'^\d+$').hasMatch(localCore) || _letterCount(local) < 2) {
    return 'Email must use a real name before @, not only numbers like 123@gmail.com.';
  }
  return null;
}
