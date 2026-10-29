# IAM / OIDC ロール 設定依頼書（管理者向け）

対象: `gyokuou0836/SCN-GitOps-test` / アカウント **646977526034** / リージョン **ap-northeast-1**

> このディレクトリは**資料**です（`docs/iam/`）。デプロイワークフローからは参照されません。
> `ntcs-wan` の IAM ユーザーは `NTCSDevGuardrailDenyPolicy` により IAM を変更できないため、
> ロールとポリシーの作成は**管理者に依頼**します。

---

## 1. 方針

| 項目 | 方針 |
|---|---|
| OIDC プロバイダ | **既存を再利用**（`arn:aws:iam::646977526034:oidc-provider/token.actions.githubusercontent.com`）。アカウントに 1 つしか作成できないため、**新規作成しない** |
| IAM ロール / ポリシー | 本リポジトリ専用に**新規作成**（`github_actions_for_aws` のロールは使用しない） |
| スタック / バケット | `scn-gitops-wangyu-${env}` / `scn-gitops-wangyu-${env}-646977526034`（既存の `s3-practice-dev` 等とは分離） |

## 2. 依頼内容（dev）

| # | 項目 | 値 |
|---|---|---|
| 1 | ロール名 | `github-actions-scn-gitops-wangyu-deploy-dev` |
| 2 | 許可ポリシー名 | `scn-gitops-wangyu-deploy-dev` |
| 3 | 信頼ポリシー `Principal.Federated` | `arn:aws:iam::646977526034:oidc-provider/token.actions.githubusercontent.com` |
| 4 | 信頼ポリシー `Action` | `sts:AssumeRoleWithWebIdentity` |
| 5 | 信頼ポリシー `Condition`（`StringEquals`） | `token.actions.githubusercontent.com:aud` = `sts.amazonaws.com`<br>`token.actions.githubusercontent.com:sub` = `repo:gyokuou0836@5299457/SCN-GitOps-test@<REPO_ID>:environment:dev` |
| 6 | `sts:TagSession` | **付与しない**（ワークフローは `role-skip-session-tagging: true`） |
| 7 | スタック操作対象 | `arn:aws:cloudformation:ap-northeast-1:646977526034:stack/scn-gitops-wangyu-dev/*` |
| 8 | S3 操作対象 | `arn:aws:s3:::scn-gitops-wangyu-dev-646977526034` |
| 9 | SSM 参照対象 | `arn:aws:ssm:ap-northeast-1:646977526034:parameter/cdk-bootstrap/*` |

`<REPO_ID>` は GitHub のリポジトリ ID（数値）です。リポジトリ作成後に以下で取得できます。

```bash
curl -s https://api.github.com/repos/gyokuou0836/SCN-GitOps-test | jq .id
```

`5299457` はオーナー（`gyokuou0836`）の不変 ID で、リポジトリ名の変更では変わりません。

### 信頼ポリシー（例）

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "GitHubActionsOidc",
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::646977526034:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          "token.actions.githubusercontent.com:sub": "repo:gyokuou0836@5299457/SCN-GitOps-test@<REPO_ID>:environment:dev"
        }
      }
    }
  ]
}
```

## 3. 許可ポリシー（例）

| Statement | Action | Resource |
|---|---|---|
| CloudFormation（スタック） | `CreateStack` / `UpdateStack` / `DescribeStacks` / `DescribeStackEvents` / `DescribeStackResources` / `ListStackResources` / `GetTemplate` / **`CreateChangeSet` / `DescribeChangeSet` / `ExecuteChangeSet` / `DeleteChangeSet`** | `arn:aws:cloudformation:ap-northeast-1:646977526034:stack/scn-gitops-wangyu-dev/*` |
| CloudFormation（テンプレート要約） | `GetTemplateSummary` | `*`（リソース指定不可） |
| S3 | `CreateBucket` / `PutBucketVersioning` / `PutEncryptionConfiguration` / `PutBucketPublicAccessBlock` / **`PutBucketPolicy`** / **`DeleteBucketPolicy`** / **`PutBucketOwnershipControls`** / `PutBucketTagging` / `GetBucketLocation` / `GetBucketVersioning` / `GetEncryptionConfiguration` / `GetBucketPublicAccessBlock` / `GetBucketPolicy` / `GetBucketOwnershipControls` / `GetBucketAcl` / `GetBucketTagging` / `ListBucket` | `arn:aws:s3:::scn-gitops-wangyu-dev-646977526034` |
| SSM | `GetParameter` | `arn:aws:ssm:ap-northeast-1:646977526034:parameter/cdk-bootstrap/*` |

**付与しない権限**: `cloudformation:DeleteStack` / `s3:DeleteBucket` / `s3:DeleteObject`

> `enforceSSL: true` は `AWS::S3::BucketPolicy` を作成するため `s3:PutBucketPolicy` が必須です。
> `objectOwnership: BUCKET_OWNER_ENFORCED` は `PutBucketOwnershipControls` を使用します。
> CDK CLI は bootstrap バージョンを SSM から取得するため `ssm:GetParameter` が必要です。

## 4. テンプレートで作成する場合

`docs/iam/github-oidc-role-wangyu.yaml` を使用します（OIDC プロバイダは作成しません）。

```bash
aws cloudformation deploy \
  --template-file docs/iam/github-oidc-role-wangyu.yaml \
  --stack-name scn-gitops-wangyu-iam \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides \
      EnvironmentName=dev \
      GitHubRepositoryId=<REPO_ID>
```

## 5. 前提確認（CDK bootstrap）

デプロイには `CDKToolkit` スタックが必要です。**デプロイロールでは bootstrap を作成できない**ため、
未作成の場合は管理者が先に実行してください。

```bash
aws cloudformation describe-stacks --stack-name CDKToolkit --region ap-northeast-1
# 無い場合
npx cdk bootstrap aws://646977526034/ap-northeast-1
```

## 6. GitHub 側の設定（リポジトリ管理者）

| # | 設定 | 値（dev） |
|---|---|---|
| 1 | Environment | `dev`（Deployment branches: `deploy_dev`） |
| 2 | Environment secret `AWS_ROLE_ARN` | `arn:aws:iam::646977526034:role/github-actions-scn-gitops-wangyu-deploy-dev` |
| 3 | Environment variable `BUCKET_NAME` | `scn-gitops-wangyu-dev-646977526034` |

## 7. 動作確認

1. `deploy_dev` ブランチへ push（または `workflow_dispatch` で `dev` を選択）
2. 失敗時は「Show Expected OIDC Subject」ステップの出力と、信頼ポリシーの `sub` を比較する
3. トークンの内容まで確認したい場合は、リポジトリ設定で `ACTIONS_STEP_DEBUG=true` を有効にして再実行する
   （`Debug OIDC Token Claims` ステップは `runner.debug == '1'` のときだけ実行されます）
4. 成功後、再実行して `No changes` になることを確認する

## 8. `sub` の可変部分

| 環境 | `sub` |
|---|---|
| `dev` | `repo:gyokuou0836@5299457/SCN-GitOps-test@<REPO_ID>:environment:dev` |
| `staging`（未整備） | `repo:gyokuou0836@5299457/SCN-GitOps-test@<REPO_ID>:environment:staging` |

`@5299457`（オーナー ID）と `@<REPO_ID>`（リポジトリ ID）は不変です。変わるのは末尾の
`environment:<env>` だけなので、環境追加時は Allow 文を追加するだけで済みます。

## 9. 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-10-29 | 新規作成。個人アカウント `646977526034` / `gyokuou0836/SCN-GitOps-test` 用に、`github_actions_for_aws` 流用から専用ロール運用へ変更（旧社用の記述は引き継がない） |
