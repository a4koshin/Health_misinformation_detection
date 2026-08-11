import 'package:flutter/material.dart';

class AppLogo extends StatelessWidget {
  const AppLogo({super.key, this.compact = false});

  final bool compact;

  static const assetPath = 'assets/image/icon.png';

  @override
  Widget build(BuildContext context) {
    return Image.asset(
      assetPath,
      height: compact ? 28 : 44,
      fit: BoxFit.contain,
      filterQuality: FilterQuality.high,
      semanticLabel: 'SomAI',
    );
  }
}
