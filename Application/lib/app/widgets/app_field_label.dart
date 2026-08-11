import 'package:flutter/material.dart';

import '../core/theme/app_colors.dart';

class AppFieldLabel extends StatelessWidget {
  const AppFieldLabel(this.text, {super.key, this.action});

  final String text;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Expanded(
            child: Text(
              text.toUpperCase(),
              style: const TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w600,
                letterSpacing: 1.4,
                color: AppColors.ink,
              ),
            ),
          ),
          ?action,
        ],
      ),
    );
  }
}
