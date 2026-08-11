import 'package:flutter/material.dart';
import 'package:iconsax_flutter/iconsax_flutter.dart';

import '../../widgets/empty_placeholder.dart';
import '../../widgets/page_header.dart';

class PredictionScreen extends StatelessWidget {
  const PredictionScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ListView(
      children: [
        PageHeader(
          title: 'Prediction',
          description: 'Check a Somali health claim with SomBERTb.',
        ),
        Padding(
          padding: EdgeInsets.symmetric(horizontal: 20),
          child: EmptyPlaceholder(
            icon: Iconsax.cpu,
            title: 'Claim check coming next',
            description:
                'This screen will let you submit text and see Reliable or Non-Reliable results.',
          ),
        ),
      ],
    );
  }
}
