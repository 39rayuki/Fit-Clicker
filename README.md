# Fit Clicker

VPC「運動ボーナス付きの放置クリッカー」の初期プロトタイプです。

## 概要
Webカメラで運動（動き）を検知すると、獲得コインが **100倍** になります。
「動くことが苦痛」を「動くことが圧倒的にお得」に変える実証実験用アプリです。

## ミッションシステム
1. **🏆 全体ミッション (Global)**: 期限なし。累計の運動回数に応じて高額報酬。
2. **📅 デイリーミッション (Daily)**: 24時間期限。毎日3種類発生。
3. **🚨 緊急ミッション (Emergency)**: 30分期限。不定期に発生し、通知が届きます。短時間で集中して動くことで大量のコインを獲得可能。

## 技術スタック
- HTML5 / Vanilla CSS
- JavaScript (ES Modules)
- **MediaPipe Pose Landmarker** (AI姿勢判定)
- **LocalStorage API** (ステータス・ミッションの保存)
- **Web Notifications API** (緊急ミッション通知)

## 使い方
1. ローカルで `index.html` を開くか、GitHub Pages 等でホストします。
2. 「Start Training」ボタンを押し、カメラの使用を許可します。
3. カメラの前で体を動かすと「100x MOTION BONUS ACTIVE」と表示され、獲得効率が跳ね上がります。
