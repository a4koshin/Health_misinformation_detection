import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';

import 'package:app/app/app.dart';

void main() {
  setUpAll(() {
    GoogleFonts.config.allowRuntimeFetching = false;
  });

  testWidgets('shows SomAI splash then sign in', (tester) async {
    await tester.pumpWidget(const SomaiApp());
    expect(find.text('SomAI'), findsWidgets);
    await tester.pump(const Duration(milliseconds: 50));
  });
}
