# SCN-GitOps-wangyu

GitHub Actions / GitOps で AWS CDK を使って S3 バケットを作成する個人検証用プロジェクトです。
対象: `gyokuou0836/SCN-GitOps-wangyu`（AWS Account: `526034` / Region: `ap-northeast-1`）

## 構成

- `bin/scn-gitops-test.ts` : CDK アプリケーションのエントリーポイント
- `lib/s3-bucket-stack.ts` : S3 バケット用のスタック
- `.github/workflows/deploy.yml` : GitHub Actions によるデプロイ

## このプロジェクトのパラメータ

| 項目 | 私用環境 | 社用環境 |
|---|---|---|
| GitHubOwner | `gyokuou0836` | `nttdocomo-com` |
| GitHubOwnerId | `5299457` | `76678837` |
| GitHubRepository（既存 GitHub 設定を再利用） | `github_actions_for_aws` | `SCN-GitOps-test` |
| GitHubRepositoryId | `1416525375` | `1421648569` |
| Project folder / sample repo | `SCN-GitOps-wangyu` | `SCN-GitOps-test` |
| EnvironmentName | `dev / [dev, staging, prod]` | `dev / [dev, staging, prod]` |
| BucketNamePrefix | `ntcs-wan-s3-practice` | `scn-gitops-s3-practice` |
| LocalUserName | `ntcs-wan` | `ntcs-wan` |
| CreateOidcProvider | `false`（既存 GitHub 設定を再利用） | `false`（既存プロバイダを利用） |
| RoleName | `github-actions-s3-practice-deploy-${EnvironmentName}` | `github-actions-scn-gitops-deploy-${EnvironmentName}` |
| PolicyName | `s3-practice-deploy` | `scn-gitops-cdk-deploy` |
| StackName (workflow) | `s3-practice-${TARGET_ENV}` | `scn-gitops-s3-practice-${TARGET_ENV}` |
| BUCKET_NAME | `ntcs-wan-s3-practice-wangyu-526034` | `scn-gitops-s3-practice-dev-448795058044` |

## GitHub 側の設定は既存の `github_actions_for_aws` を再利用

- OIDC provider、IAM ロール、許可ポリシーは、既存の `gyokuou0836/github_actions_for_aws` で作成済みのものを使います。
- ここでは新規作成を行わず、既存設定の引き継ぎとして使います。
- `AWS_ROLE_ARN` と `BUCKET_NAME` は GitHub の既存 Environment / Repository setting をそのまま利用します。
- `SCN-GitOps-wangyu` はサンプルの作業ディレクトリ名・プロジェクト名であり、GitHub 側の OIDC 実体は `github_actions_for_aws` の設定をそのまま使います。

## 重要な前提

- `BUCKET_NAME` は GitHub Environment variable と一致させてください。
- 既存の社用プロジェクトの値を残したままでは、個人環境での検証が正しく動作しません。
- 新規に OIDC provider、ロール、ポリシーを作成しません。既存の `github_actions_for_aws` を使います。

## AWS 側の基本設定

| 項目 | 値 |
|---|---|
| AWS account | `526034` |
| AWS region | `ap-northeast-1` |
| OIDC provider | `arn:aws:iam::526034:oidc-provider/token.actions.githubusercontent.com` |
| Role ARN (例) | `arn:aws:iam::526034:role/github-actions-s3-practice-deploy-dev` |
| Bucket name (例) | `ntcs-wan-s3-practice-wangyu-526034` |
| Stack name (例) | `s3-practice-dev` |

## ローカル検証

```bash
npm ci
npm run build
npx cdk synth --context env=dev --context bucketName=ntcs-wan-s3-practice-wangyu-526034
```

## GitHub Actions での使い方

- `AWS_ROLE_ARN` を GitHub Environment の Secret として設定する
- `BUCKET_NAME` を GitHub Environment variable として設定する
- `TARGET_ENV` は `dev` / `staging` / `prod` のどれかを使う

例:

```text
TARGET_ENV=dev
BUCKET_NAME=ntcs-wan-s3-practice-wangyu-526034
```

## 注意事項

- `CreateOidcProvider=true` の場合、AWS の OIDC provider が存在しないと失敗するので事前確認が必要です。
- `BUCKET_NAME` が未設定のままだとワークフローはデプロイ前に停止します。
- スタック名やロール名を社用値にそのまま使うと、個人環境の AWS リソースと競合します。
