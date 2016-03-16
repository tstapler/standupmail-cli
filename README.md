# standupmail-cli
StandupMail command line client.

## Installation

Via git (or downloaded tarball):

```bash
$ git clone git@github.com:ericlarssen/standupmail-cli.git
```
Via [npm](http://npmjs.org/):

```bash
$ npm install -g standupmail-cli
```


## Basic Usage

### Login

You will need to get your credentials from https://www.standupmail.com/#account
```bash
$ standup login -t <api_token> -i <access_id>
```

### Teams
Viewing teams assigned to you
``` bash
$ standup teams
```

### Show
Show messages from you and your team.

Show your messages today.
``` bash
$ standup show
```

Show your messages for the past 3 days.
``` bash
$ standup show -n 3
```

Show your teams messages for the past 3 days.
``` bash
$ standup show -n 3 --all
```

### Update
Sending updates to teams on standupmail

Working
``` bash
$ standup update -w "10% time project."
```

Done
``` bash
$ standup update -d "YAY! I finished something."
```

Blocked
``` bash
$ standup update -b "Uh oh. We can't go further cap'n.";
```

Send to specific teams, when you belong to multiple
``` bash
$ standup teams
[
  {'id': 9999, 'name': 'SWEET TEAM'},
  {'id': 8888, 'name': 'Less sweet team'},
  {'id': 7777, 'name': 'that other team'}
]
$ standup update -t 9999 8888 -w "Don't tell that other team."
```


## Issues

You can find list of issues using **[this link](http://github.com/ericlarssen/standupmail-cli/issues)**.

## Requirements

 - **[Node.js](http://nodejs.org)** - Event-driven I/O server-side JavaScript environment based on V8.
 - **[npm](http://npmjs.org)** - Package manager. Installs, publishes and manages node programs.
