import 'package:flutter/material.dart';

import 'app_card.dart';

class EmptyPlaceholder extends StatelessWidget {
  const EmptyPlaceholder({
    super.key,
    required this.icon,
    required this.title,
    required this.description,
  });

  final IconData icon;
  final String title;
  final String description;

  @override
  Widget build(BuildContext context) {
    return EmptyStateCard(
      icon: icon,
      title: title,
      description: description,
    );
  }
}
