import 'package:flutter/material.dart';
import 'package:iconsax_flutter/iconsax_flutter.dart';

import '../../widgets/empty_placeholder.dart';
import '../../widgets/page_header.dart';

class CorrectionsScreen extends StatelessWidget {
  const CorrectionsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ListView(
      children: [
        PageHeader(
          title: 'Corrections',
          description: 'Sentences a healthcare advisor rewrote for you.',
        ),
        Padding(
          padding: EdgeInsets.symmetric(horizontal: 20),
          child: EmptyPlaceholder(
            icon: Iconsax.message_edit,
            title: 'No corrections yet',
            description:
                'When an advisor corrects a Non-Reliable claim, it will appear here.',
          ),
        ),
      ],
    );
  }
}
