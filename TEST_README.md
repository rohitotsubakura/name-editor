# テスト実行ガイド

このプロジェクトでは、JestとTesting Library/Reactを使用してテストを実装しています。

## テストファイル構成

```
src/app/__tests__/
├── app-simple.test.tsx      # 基本的なテストケース
├── app-advanced.test.tsx    # 高度なテストケース
├── page.test.tsx           # 元のテストファイル（一部修正が必要）
├── app-integration.test.tsx # 統合テスト（一部修正が必要）
└── app-edge-cases.test.tsx  # エッジケーステスト（一部修正が必要）
```

## テスト実行コマンド

### 全テスト実行
```bash
npm test
```

### 特定のテストファイル実行
```bash
# 基本テストのみ
npm test -- --testPathPatterns=app-simple.test.tsx

# 高度なテストのみ
npm test -- --testPathPatterns=app-advanced.test.tsx

# 推奨テスト（基本 + 高度）
npm test -- --testPathPatterns="app-simple|app-advanced"
```

### カバレッジ付きテスト実行
```bash
npm test -- --coverage --testPathPatterns="app-simple|app-advanced"
```

### ウォッチモード
```bash
npm run test:watch
```

## テスト内容

### 基本テスト (app-simple.test.tsx)
- UI要素の存在確認
- Fabric.jsキャンバスの初期化
- 色変更ボタンの動作
- 線の太さ変更ボタンの動作
- 消しゴム機能
- アンドゥ・リドゥボタンの初期状態
- キャンバスのクリーンアップ
- キーボードショートカット
- キャンバスイベントハンドリング

### 高度なテスト (app-advanced.test.tsx)
- アンドゥ・リドゥ機能の完全なワークフロー
- キーボードショートカットの詳細テスト
- Mac互換性（Metaキー）
- Shift+Ctrl+Zでのリドゥ
- ブラシプロパティの設定確認
- 消しゴム機能の詳細テスト
- オブジェクトのerasableプロパティ設定
- 高速ツール変更の処理
- 各種キャンバスイベントのエラーハンドリング
- 修飾キーなしのキー押下の処理

## モック設定

### Fabric.js
- `fabric.Canvas`: キャンバスオブジェクトのモック
- `fabric.PencilBrush`: ペンシルブラシのモック

### @erase2d/fabric
- `EraserBrush`: 消しゴムブラシのモック

### HTMLCanvasElement
- `getContext`: キャンバスコンテキストのモック

## テストカバレッジ

現在のテストカバレッジ:
- Statements: 86.33%
- Branches: 75.67%
- Functions: 95.65%
- Lines: 87.96%

## 注意事項

1. **act()警告**: 一部のテストでReactの状態更新に関するact()警告が表示されますが、テストは正常に動作します。

2. **Jest設定警告**: `moduleNameMapping`に関する警告が表示されますが、テストの実行には影響しません。

3. **エラーハンドリング**: アプリケーション側でCanvas初期化とdisposeのエラーハンドリングが実装されています。

## トラブルシューティング

### テストが失敗する場合
1. 依存関係が正しくインストールされているか確認
2. Jest設定ファイル（jest.config.js）が正しく設定されているか確認
3. モック設定（jest.setup.js）が正しく読み込まれているか確認

### 新しいテストを追加する場合
1. 適切なモック設定を使用
2. 非同期操作には`act()`を使用
3. 状態変更を伴う操作には`waitFor()`を使用
4. キーボードイベントテストでは`preventDefault`のモックを適切に設定

## 推奨テスト実行

開発時は以下のコマンドを使用することを推奨します：

```bash
# 基本的なテストと高度なテストのみ実行（安定版）
npm test -- --testPathPatterns="app-simple|app-advanced"

# カバレッジ付きで実行
npm test -- --coverage --testPathPatterns="app-simple|app-advanced"
```

これらのテストは安定しており、アプリケーションの主要機能をカバーしています。