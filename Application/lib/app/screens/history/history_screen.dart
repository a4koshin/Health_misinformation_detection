import 'package:flutter/material.dart';
import 'package:iconsax_flutter/iconsax_flutter.dart';

import '../../widgets/empty_placeholder.dart';
import '../../widgets/page_header.dart';

class HistoryScreen extends StatelessWidget {
  const HistoryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ListView(
      children: [
        PageHeader(
          title: 'History',
          description: 'Your previous claim checks.',
        ),
        Padding(
          padding: EdgeInsets.symmetric(horizontal: 20),
          child: EmptyPlaceholder(
            icon: Iconsax.clock,
            title: 'No history yet',
            description:
                'Checked claims will show up here once Prediction is connected.',
          ),
        ),
      ],
    );
  }
}
