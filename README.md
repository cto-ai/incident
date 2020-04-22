![](https://cto.ai/static/oss-banner.png)

# Incident 🚀

An Op to simplify incident management.

## Requirements

To run this or any other Op, install the [Ops Platform](https://cto.ai/platform).

Find information about how to run and build Ops via the [Ops Platform Documentation](https://cto.ai/docs/overview).

This Op requires credentials based on which services you integrate with:

- **GitLab Access Token -** [Creating GitLab Personal Access Tokens](https://docs.gitlab.com/ee/user/profile/personal_access_tokens.html)
- **PagerDuty API key -** [Getting PagerDuty API Key](https://support.pagerduty.com/docs/generating-api-keys)
- **Slack WebHook URL -** [Adding Slack Webhooks Guide](https://slack.com/intl/en-ca/help/articles/115005265063-Incoming-WebHooks-for-Slack)

## Usage

Running `ops run incident`, gives you an interactive prompt to select CLI commands to **create**, **update**, **list**, and **search** incidents.

A list of other various run time arguments:

- **-l, --list: return List issues**
- **-s, --search: return Search for incidents**
- **-c, --create: return Create an incident**
- **-u, --update: return Update an incident**
- **-o, --onCall: return List On-Call**

## Current Integrations

Current integrations and functionality includes:

- Create a GitLab issue regarding the incident
- Send a message/alert through a Slack linked channel
- Create a PagerDuty incident and assign based on priority

## Future Integrations

Currently aside from adding additional functionality and features we are exploring integrations into the following other tools:

- Jira
- VictorOps

Please reach feel free to create an issue to request additional integrations or reach out to us at the [CTO.ai Community Slack Channel](https://join.slack.com/t/cto-ai-community/shared_invite/enQtNzcwNTcxNDEzNDA5LTc4ODRlZTUzMDVlODc5ZjE3Y2ZjN2MyYmQ4MDdlYjc4MDI5NGUwMWY1YmE2ZTkyYTZmZTU2MjY3YWJkMzQyYWQ).

## Local Development

To develop and run ops locally

1. Clone the repo `git clone <git url>`
2. `cd` into the directory and install dependancies with `npm install`
3. Run the Op from your local source code with `ops run path/to/op`
