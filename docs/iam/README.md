# IAM / OIDC ロール 設定記録（管理者・引き継ぎ用）

対象: `nttdocomo-com/SCN-GitOps-test` / アカウント **448795058044** / リージョン **ap-northeast-1**

> **このディレクトリは資料です**（`docs/iam/`）。デプロイワークフローからは参照されません。
> `deploy.yml` / `scripts/deploy.py` が使うのは `cfn/s3-bucket.yaml` のみです。ここにあるのは、
> `ntcs-wan` には実行できない（`NTCSDevGuardrailDenyPolicy` で Deny）IAM 設定の**手順と設定記録**です。
> ロール／ポリシーの定義は AWS 側で管理しており、本リポジトリにはテンプレートを置いていません。

---

## 1. 現在の状態（2026-10-28 時点）

| 項目 | 値 | 状態 |
|---|---|---|
| OIDC プロバイダ | `arn:aws:iam::448795058044:oidc-provider/token.actions.githubusercontent.com` | 既存（`ClientIDList=[sts.amazonaws.com]`） |
| デプロイロール | `arn:aws:iam::448795058044:role/github-actions-scn-gitops-deploy-dev` | 管理者が作成済み |
| 信頼ポリシー `sub` | `repo:nttdocomo-com@76678837/SCN-GitOps-test@1421648569:environment:dev` | 設定済み（`StringEquals`） |
| 許可ポリシー | `scn-gitops-cdk-deploy` | 設定済み |
| 対象スタック | `arn:aws:cloudformation:ap-northeast-1:448795058044:stack/scn-gitops-s3-practice-dev/*` | スタック名の**完全一致**が必須 |
| 対象バケット | `arn:aws:s3:::scn-gitops-s3-practice-dev-448795058044` | バケット名の**完全一致**が必須 |
| GitHub OIDC 設定 | `use_immutable_subject: true`、`sub_claim_prefix = repo:nttdocomo-com@76678837/SCN-GitOps-test@1421648569` | 設定済み（実測） |
| GitHub Environment | `dev` のみ（Deployment branches: `deploy_dev`） | 作成済み |
| Actions の実行 | — | **未実施**（GitHub 側の変数設定・マージ待ち） |

### 信頼ポリシー（実物の要約）

全文は AWS コンソール（IAM → ロール → 信頼関係）で確認できます。2 つの `Allow` 文で構成されます。

| Sid | Principal | Action | Condition |
|---|---|---|---|
| `GitHubActionsOidc` | Federated `arn:aws:iam::448795058044:oidc-provider/token.actions.githubusercontent.com` | `sts:AssumeRoleWithWebIdentity` | `StringEquals`: `token.actions.githubusercontent.com:sub` = `repo:nttdocomo-com@76678837/SCN-GitOps-test@1421648569:environment:dev`、`token.actions.githubusercontent.com:aud` = `sts.amazonaws.com` |
| `LocalDeveloperAssume` | AWS: 13 名の IAM ユーザー（`ntcs-wan` を含む） | `sts:AssumeRole` | なし |

- `sub` は**配列ではなく単一文字列**です（`dev` 専用）。`staging` 以降を追加するときは文を追加します。
- `sts:TagSession` は含まれないため、ワークフローは `role-skip-session-tagging: true` を指定しています。
- ローカル検証用の 13 名の一覧は AWS 側の信頼ポリシーを参照してください（本リポジトリには記載しません）。

### 許可ポリシー `scn-gitops-cdk-deploy`（実物の要約）

| Statement | Action | Resource |
|---|---|---|
| CloudFormation | `CreateStack` / `UpdateStack` / `DescribeStacks` / `DescribeStackEvents` / `DescribeStackResources` / `ListStackResources` / `GetTemplate` | `arn:aws:cloudformation:ap-northeast-1:448795058044:stack/scn-gitops-s3-practice-dev/*` |
| S3 | `CreateBucket` / `PutBucketVersioning` / `PutEncryptionConfiguration` / `PutBucketPublicAccessBlock` / `PutBucketTagging` / `GetBucketLocation` / `GetBucketVersioning` / `GetEncryptionConfiguration` / `GetBucketPublicAccessBlock` / `GetBucketTagging` / `GetBucketPolicy` / `GetBucketAcl` / `ListBucket` | `arn:aws:s3:::scn-gitops-s3-practice-dev-448795058044` |

- `cloudformation:ValidateTemplate` は付与されていません（`scripts/deploy.py` は使用しません）。
- `s3:DeleteBucket` / `s3:DeleteObject` / `cloudformation:DeleteStack` は付与されていません（誤削除が起きない設計）。

### `sub` の可変部分は「環境」だけ（ID は固定）

`@76678837`（**組織 ID**）と `@1421648569`（**リポジトリ ID**）は GitHub が発行する**不変識別子**で、
**環境・ブランチ・リネームでは変わりません**。変わるのは末尾の `environment:<env>` 部分だけです。

| 環境 | `sub` |
|---|---|
| `dev` | `repo:nttdocomo-com@76678837/SCN-GitOps-test@1421648569:environment:dev` |
| `staging` | `repo:nttdocomo-com@76678837/SCN-GitOps-test@1421648569:environment:staging` |
| （未追加）`prod` | `repo:nttdocomo-com@76678837/SCN-GitOps-test@1421648569:environment:prod` |

→ **環境を増やすときは、その環境の行（Allow 文）を信頼ポリシーに追加するだけ**で、ID の書き換えは不要です。
ID が変わるのは**別アカウントへのリポジトリ移転（transfer）や fork** をした場合のみです。

## 2. 引き継ぎ: GitHub 側の設定（別担当者）

AWS 側（ロール・信頼ポリシー・許可ポリシー）は設定済みです。残りは GitHub 側の設定と初回実行です。

| # | 設定 | 値 | 状態 |
|---|---|---|---|
| 1 | Environment | `dev` | 作成済み |
| 2 | Environment secret `AWS_ROLE_ARN` | `arn:aws:iam::448795058044:role/github-actions-scn-gitops-deploy-dev` | 存在は確認済み（値の一致は要確認） |
| 3 | Environment variable `BUCKET_NAME` | `scn-gitops-s3-practice-dev-448795058044` | **未設定**（2026-10-28 実測 0 件） |
| 4 | `deploy.yml` の配置 | `feature/withcdk` → `deploy_dev` へマージ | 未マージ（デフォルトブランチに `deploy.yml` が無い） |
| 5 | Deployment branches | `dev` は `deploy_dev` のみ許可 | 設定済み |
| 6 | 初回実行 | Actions → deploy → Run workflow（environment=`dev`） | 未実施 |

- 手順 4 が終わるまで **Run workflow は UI に表示されません**（`workflow_dispatch` はデフォルトブランチの定義のみ読み込まれるため）。
- 手順 3 が未設定のまま実行すると、`Check required variables` ステップで
  `::error::Environment 変数 BUCKET_NAME が未設定です` となり停止します
  （`scripts/deploy.py` の `--param must use a non-empty Key=Value format` より手前で、原因が分かる形にしています）。
- `staging` / `prod` の Environment・ロールは未作成です。ブランチ `deploy_stg` へ push すると
  `staging` Environment が保護ルール無しで自動生成され、その後の `AssumeRole` で失敗します。

## 3. `ntcs-wan` が実施できない操作（実測）

`ntcs-wan` は本リポジトリの作業者ですが、IAM の変更・読み取りができません。
以下は 2026-10-28 に新アカウントで再確認した結果です。

### アタッチされているポリシー

| ポリシー | 本件での役割 |
|---|---|
| `NTCSDevIAMAllowPolicy` | IAM の許可（`gijiko-*` に限定した管理操作など。**IAM の読み取りは実測 Deny**） |
| `NTCSDevGuardrailDenyPolicy` | **明示 Deny**（アタッチポリシー兼 PermissionsBoundary） |
| `NTCSBusinessServicesPolicy` | CFN / S3 / EC2 等の許可（`ap-northeast-1`・`ap-northeast-3` のみ） |
| `MFASelfManagePolicy` / `IAMUserChangePassword` / `AmazonQDeveloperAccess` | 本件と無関係 |

インラインポリシーは 0 件です。`iam:SimulatePrincipalPolicy` も許可されていないため、
各アクションの可否はポリシー文との突き合わせと、実際の API 呼び出し（Deny の実測）で判定しています。

### できない操作（管理者への依頼対象）

| # | 操作 | 必要なアクション | `ntcs-wan` | 根拠 |
|---|---|---|---|---|
| A-1 | 信頼ポリシーの更新 | `iam:UpdateAssumeRolePolicy` | ❌ 不可 | `DenyTrustRelationshipTampering`（`Resource:*`・条件なし）／Allow も無し |
| A-2 | ロールの確認（読み取り） | `iam:GetRole` | ❌ **不可（実測 Deny）** | `NTCSDevGuardrailDenyPolicy`。旧版の「✅ 可」は誤り |
| B-1 | ロール作成 | `iam:CreateRole` | ❌ 不可 | `DenyUserAndGroupManagement`（`Resource:*`・条件なし）／Allow も無し |
| B-2 | ロールへのタグ付与 | `iam:TagRole` | ❌ 不可 | Allow 無し（CloudFormation が自動付与） |
| B-3 | インラインポリシー作成 | `iam:PutRolePolicy` | ❌ 不可 | `DenyModifyingNonBoundedRoles`（`iam:PermissionsBoundary` が `NTCSDevBoundary` 以外は Deny） |
| B-4 | ロールバック時の削除 | `iam:DeleteRole` / `iam:DeleteRolePolicy` | ❌ 不可 | `DenyUserAndGroupManagement` |
| B-5 | OIDC プロバイダ作成 | `iam:CreateOpenIDConnectProvider` | ❌ 不可 | Allow 無し（既存のため不要） |
| B-6 | スタック操作 | `cloudformation:*` | ⚠️ **一部のみ** | `NTCSBusinessServicesPolicy`（対象リージョンのみ）。`ValidateTemplate` は**実測 Deny** |

### 依頼者側（`ntcs-wan`）が自分でできる操作

| 操作 | コマンド等 | 可否 |
|---|---|---|
| 現状の確認 | `aws iam get-role --role-name github-actions-scn-gitops-deploy-dev` | ❌ 不可（実測 Deny） |
| 変更後 JSON の準備 | `trust-policy.json` の作成 | ✅ 可（ローカル作業） |
| デプロイ（ロール新規作成） | `aws cloudformation deploy ...` | ❌ 不可（B-1〜B-4） |
| 信頼ポリシーの更新 | `aws iam update-assume-role-policy ...` | ❌ 不可（A-1） |
| ローカル疎通（ロールを assume） | `aws sts assume-role --role-arn arn:aws:iam::448795058044:role/github-actions-scn-gitops-deploy-dev ...` | ❌ 不可（`AllowAssumeTerraformRoles` は `gijiko-*-iam-role-terraform-*` のみ許可） |

> デプロイロールの信頼ポリシーには `ntcs-wan` を含む 13 名の `sts:AssumeRole` 文がありますが、
> `ntcs-wan` 側に `sts:AssumeRole` の許可が無いため、現状は assume できません。

> **旧版からの訂正**: 旧版では「`ntcs-wan` は `iam:GetRole` 可」「`cloudformation:*` 可」としていましたが、
> 新アカウントで実測したところ、いずれも一部または全部が Deny でした。

## 4. トラブルシューティング

### `Not authorized to perform sts:AssumeRoleWithWebIdentity`

トークンの `sub` と信頼ポリシーの `sub` を比較してください。

| 確認箇所 | 期待値（dev） |
|---|---|
| Actions ログ `Debug OIDC Token Claims` の `sub` | `repo:nttdocomo-com@76678837/SCN-GitOps-test@1421648569:environment:dev` |
| Actions ログ `Show Expected OIDC Subject` | 上と一致（`github.repository_owner_id` / `github.repository_id` から生成） |
| 信頼ポリシーの `sub` | 上と一致（`StringEquals`） |
| `aud` | `sts.amazonaws.com` |

- 一致しない場合は、管理者に信頼ポリシーの `sub` を実トークンの値へ更新してもらいます（A-1）。
- 同じ条件キーに `StringLike` と `StringEquals` を併記すると **AND 評価**になり一致しません。

### `AccessDenied`（`cloudformation:CreateStack` / `s3:CreateBucket` / `DescribeStacks`）

スタック名・バケット名が許可ポリシーの ARN と**完全一致**しているか確認します。

| 対象 | 期待値 |
|---|---|
| スタック名（`deploy.yml` の `--stack-name`） | `scn-gitops-s3-practice-dev` |
| `BUCKET_NAME`（Environment variable） | `scn-gitops-s3-practice-dev-448795058044` |
| 参照方法 | `vars.BUCKET_NAME`（Secret ではない） |

### `Failed to create the changeset: ... NAME_CONFLICT_VALIDATION`（ロールを新規作成する場合）

OIDC プロバイダはアカウントに **1 つだけ**作成できます。
`arn:aws:iam::448795058044:oidc-provider/token.actions.githubusercontent.com` は**作成済み**です。

```
ValidationName: NAME_CONFLICT_VALIDATION
LogicalResourceId: GitHubOidcProvider (AWS::IAM::OIDCProvider)
"Resource of type 'AWS::IAM::OIDCProvider' with identifier
 'arn:aws:iam::448795058044:oidc-provider/token.actions.githubusercontent.com' already exists."
```

→ プロバイダは**新規作成せず**、既存の ARN を `Principal.Federated` に指定してロールだけを作成します（§5）。

## 5. 新規環境（staging 以降）を追加する場合

AWS 側は**管理者が実施**します（`ntcs-wan` は IAM 変更不可）。
ロール／ポリシーの定義は AWS 側で管理しており、本リポジトリにはテンプレートを置いていません。
以下は、管理者へそのまま渡せる依頼仕様です（例: staging）。

### 5-1. ロール作成の依頼仕様（AWS 側）

| 項目 | 値 |
|---|---|
| ロール名 | `github-actions-scn-gitops-deploy-<env>`（例: `github-actions-scn-gitops-deploy-staging`） |
| 信頼ポリシー `Principal.Federated` | `arn:aws:iam::448795058044:oidc-provider/token.actions.githubusercontent.com`（**作成済み。新規作成しない**） |
| 信頼ポリシー `Action` | `sts:AssumeRoleWithWebIdentity` |
| 信頼ポリシー `Condition`（`StringEquals`） | `token.actions.githubusercontent.com:sub` = `repo:nttdocomo-com@76678837/SCN-GitOps-test@1421648569:environment:<env>`<br>`token.actions.githubusercontent.com:aud` = `sts.amazonaws.com` |
| `sts:TagSession` | **不要**（ワークフローは `role-skip-session-tagging: true`） |
| 許可ポリシー名（任意） | `scn-gitops-cdk-deploy-<env>` |
| 許可（CloudFormation） | `CreateStack` / `UpdateStack` / `DescribeStacks` / `DescribeStackEvents` / `DescribeStackResources` / `ListStackResources` / `GetTemplate`<br>対象: `arn:aws:cloudformation:ap-northeast-1:448795058044:stack/scn-gitops-s3-practice-<env>/*` |
| 許可（S3） | `CreateBucket` / `PutBucketVersioning` / `PutEncryptionConfiguration` / `PutBucketPublicAccessBlock` / `PutBucketTagging` / `GetBucketLocation` / `GetBucketVersioning` / `GetEncryptionConfiguration` / `GetBucketPublicAccessBlock` / `GetBucketTagging` / `GetBucketPolicy` / `GetBucketAcl` / `ListBucket`<br>対象: `arn:aws:s3:::scn-gitops-s3-practice-<env>-448795058044` |
| 付与しない権限 | `cloudformation:ValidateTemplate` / `cloudformation:DeleteStack` / `s3:DeleteBucket` / `s3:DeleteObject` |
| ローカル検証用（任意） | `sts:AssumeRole` を許可する IAM ユーザー（13 名＋`ntcs-wan`） |

> ⚠️ OIDC プロバイダは**アカウントに 1 つだけ**作成可能で、既に作成済みです。
> ロール作成時にプロバイダも同時に作ろうとすると `NAME_CONFLICT_VALIDATION` になります（§4）。

作成後、ロールの ARN を控えます（staging の例: `arn:aws:iam::448795058044:role/github-actions-scn-gitops-deploy-staging`）。

### 5-2. GitHub 側（リポジトリ管理者）

| # | 設定 | staging の例 |
|---|---|---|
| 1 | Environment | `staging` を作成（Deployment branches: `deploy_stg`） |
| 2 | Environment secret `AWS_ROLE_ARN` | `arn:aws:iam::448795058044:role/github-actions-scn-gitops-deploy-staging` |
| 3 | Environment variable `BUCKET_NAME` | `scn-gitops-s3-practice-staging-448795058044` |

## 6. 信頼ポリシー `sub` の書き方メモ

| 方式 | `sub` の例 | 備考 |
|---|---|---|
| immutable（本環境・推奨） | `repo:nttdocomo-com@76678837/SCN-GitOps-test@1421648569:environment:dev` | Settings → Actions → OIDC で immutable subject が有効な場合 |
| 旧形式 | `repo:nttdocomo-com/SCN-GitOps-test:environment:dev` | immutable を無効化した場合のみ |

- `sub` に含まれる数値 ID は「組織／リポジトリ固有の不変 ID」です（組織 `76678837` / リポジトリ `1421648569`）。
  リポジトリ名を変更しても変わりません。
- 実環境は `StringEquals` の**単一文字列**（`dev` のみ）です。環境を増やすときは Allow 文を追加します。

## 7. 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-10-28 | 新アカウント `448795058044` / `nttdocomo-com/SCN-GitOps-test` / ロール `github-actions-scn-gitops-deploy-dev` に更新。`iam:GetRole`・`cloudformation:ValidateTemplate` の可否を実測値に訂正。旧環境（個人アカウント）の依頼文面・実測記録は削除（Git 履歴に残る） |
| 2026-10-28 | 雛形テンプレート `docs/iam/github-oidc-role.yaml` を削除（ロール／ポリシーは AWS 側で管理。`cfn-lint` 対象・PR トリガーからも除外）。新規環境の追加は §5 の依頼仕様表で実施 |
| 2026-10-28 | コミットの作者情報を社用アカウント（`NTC-GyokuOu` / `wan.gyu@ntc.co.jp`）に統一し、個人アカウントの紐付けを解消（`feature/withcdk` の既存 2 コミットの author/committer を書き換え） |
