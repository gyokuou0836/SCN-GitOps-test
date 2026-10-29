# SCN-GitOps-wangyu

GitHub Actions と AWS CDK で S3 バケットを作成・管理する個人検証用プロジェクトです。

- ローカルフォルダ名: `SCN-GitOps-wangyu`
- GitHub リポジトリ: `gyokuou0836/SCN-GitOps-test`
  （ブランチ階層: `main` → `deploy_dev` → `feature/withcdk`）
- AWS アカウント: `646977526034` / リージョン: `ap-northeast-1`

> フォルダ名とリポジトリ名は異なります。コードは個人アカウントの検証用リポジトリ
> `SCN-GitOps-test` で管理します。

## 構成

| パス | 役割 |
|---|---|
| `bin/scn-gitops-wangyu.ts` | CDK アプリのエントリーポイント |
| `lib/s3-bucket-stack.ts` | S3 バケット用スタック |
| `.github/workflows/deploy.yml` | GitHub Actions による synth（PR）と deploy（push / 手動） |
| `docs/iam/README.md` | IAM ロール・ポリシーの設定依頼書 |
| `docs/iam/github-oidc-role-wangyu.yaml` | ロール・ポリシーの CloudFormation テンプレート |

## リソース命名

| 種別 | 名前 | dev の例 |
|---|---|---|
| スタック | `scn-gitops-wangyu-${env}` | `scn-gitops-wangyu-dev` |
| S3 バケット | `scn-gitops-wangyu-${env}-646977526034` | `scn-gitops-wangyu-dev-646977526034` |
| IAM ロール | `github-actions-scn-gitops-wangyu-deploy-${env}` | `github-actions-scn-gitops-wangyu-deploy-dev` |
| IAM ポリシー | `scn-gitops-wangyu-deploy-${env}` | `scn-gitops-wangyu-deploy-dev` |
| GitHub Environment | `${env}` | `dev`（`staging` は未整備） |

- スタック名とバケット名に環境名を含め、複数環境が同一リソースを奪い合わないようにしています。
- バケット名には 12 桁の AWS アカウント ID を含め、既存バケットとの衝突を避けています。
- 既存の `s3-practice-dev` スタックや `ntcs-wan-s3-practice-wangyu-526034` バケットには影響しません。

## OIDC / IAM の考え方

| 項目 | 方針 |
|---|---|
| OIDC プロバイダ | アカウントに 1 つだけ作成できるため、既存の `token.actions.githubusercontent.com` を再利用（新規作成しない） |
| IAM ロール / ポリシー | 本リポジトリ専用に新規作成。`github_actions_for_aws` のロールは使用しない |
| 信頼ポリシー `sub` | `repo:gyokuou0836@5299457/SCN-GitOps-test@<REPO_ID>:environment:${env}` |

詳細と管理者への依頼手順は `docs/iam/README.md` を参照してください。

## 前提条件

1. GitHub リポジトリ `gyokuou0836/SCN-GitOps-test` が存在し、`<REPO_ID>` が判明している
2. `docs/iam/` の内容で管理者がロールとポリシーを作成済み
3. `CDKToolkit` スタック（`cdk bootstrap`）が `646977526034` / `ap-northeast-1` に存在する
4. GitHub Environment `dev` に Secret `AWS_ROLE_ARN` と Variable `BUCKET_NAME` を設定済み

## ローカルでの検証

AWS アカウント ID の指定が必須です（12 桁でない場合は明示的にエラー終了します）。

> ⚠️ CDK CLI はローカルの AWS 認証情報から `CDK_DEFAULT_ACCOUNT` を**上書き**します。
> 別アカウントの認証情報が設定されていると意図しないアカウントで synth / deploy されるため、
> `--context account=` で明示指定してください（本プロジェクトは context を優先します）。

```bash
npm ci
npm run build
npx cdk synth --context env=dev --context account=646977526034
```

PowerShell の場合:

```powershell
npm ci
npm run build
npx cdk synth --context env=dev --context account=646977526034
```

ローカルからデプロイする場合は、事前に `aws sts get-caller-identity` で
アカウントが `646977526034` であることを確認してください。

## GitHub Actions

| イベント | 動作 |
|---|---|
| `pull_request`（`deploy_dev` / `deploy_stg` / `main` 向け） | `validate` ジョブ（型チェック + synth）。AWS 認証は行わない |
| `push`（`deploy_dev` / `deploy_stg`） | `deploy` ジョブ（OIDC で AssumeRole して `cdk deploy`） |
| `workflow_dispatch` | 対象環境を選んで手動デプロイ（`dev` / `staging`） |

デプロイは `--stack-name scn-gitops-wangyu-${TARGET_ENV}` を明示して実行します
（`--all` は使用しません）。

### Environment の設定値（dev）

| 種別 | 名前 | 値 |
|---|---|---|
| Secret | `AWS_ROLE_ARN` | `arn:aws:iam::646977526034:role/github-actions-scn-gitops-wangyu-deploy-dev` |
| Variable | `BUCKET_NAME` | `scn-gitops-wangyu-dev-646977526034` |

`BUCKET_NAME` が未設定の場合、ワークフローはデプロイ前に停止します。

## 初回デプロイ手順

1. `feature/withcdk` を push し、`deploy_dev` へマージする
2. `deploy_dev` への push で `deploy` ジョブが実行される
3. 失敗した場合は「Show Expected OIDC Subject」に出力された `sub` と、
   ロールの信頼ポリシーを照合する
4. 再実行して `No changes` になることを確認する

## 注意事項

- バケットは `RemovalPolicy.RETAIN` です。スタックを削除してもバケットは残ります
- `prod` 環境は未整備です（ロールと Environment を作成してから追加してください）
- OIDC プロバイダはアカウントに 1 つだけなので、ロール作成時に同時作成しないでください
  （`NAME_CONFLICT_VALIDATION` になります）
