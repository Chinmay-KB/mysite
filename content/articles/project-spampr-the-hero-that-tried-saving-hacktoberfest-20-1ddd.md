---
title: "project-spampr: The hero that tried saving hacktoberfest '20"
date: 2020-10-09
tags: "hacktoberfest, github, opensource"
canonical: https://dev.to/chinmaykb/project-spampr-the-hero-that-tried-saving-hacktoberfest-20-1ddd
cover: https://media2.dev.to/dynamic/image/width=1000,height=420,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.amazonaws.com%2Fi%2Ftvlwue1id4lgwywabu4b.png
description: "Eh ! It\u2019s the thoughts that matter, right?  For those who are still using Internet Explorer, Hacktobe..."
---

*Eh ! It’s the thoughts that matter, right?*

For those who are still using Internet Explorer, Hacktoberfest is Digital Ocean’s annual month long celebration of Open Source community and contributions. Digital Ocean ships a T- shirt and stickers to the first 70,000 people who successfully open 4 pull requests to any public repository. At least that’s what it was for the past seven years until October 2nd 2020.

This year, things went tits up when a barrage of noobs bombarded public repositories with spammy pull requests. Some of the jewels being…

![EjV2jnXUYAEobB-](https://dev-to-uploads.s3.amazonaws.com/i/bjvo6cqoucjery2o33z7.jpeg)
 
 
It was a maintainer’s worst nightmare come true, like a Github version of Denial of Service attack!. They had to reject those PRs, close them, label them invalid manually to prevent overcrowding. Within a day of Hacktoberfest, it had drawn massive flak for the mess it had caused. I have taken part in Hacktoberfest for the last 2 years, and the T shirts are very dear to me. If they were to be doled out for trash pull requests, then it would reduce the value of the T shirts the legitimate contributors had earned. So in the morning of 2nd October, I set out to restore the balance of the open source universe, all by myself…

### The gameplan
1. Make a Github bot.
2. Find out a way to screen spammy PRs
3. Get it out ASAP !!! 

### The problems
1. I didn’t know the difference between a github action and a github bot, let alone how they work.
2. I believe JS should not exist on the face of this Earth, and now I had to code in JS.
3. I don’t know JS.
4. Webhooks what?

### Good Luck and Godspeed…

I don’t know if it was my ignorance or lack of familiarity with JS, but I could hardly find any good documentation for a beginner testing waters in github app. Many of the tutorials I looked into were about Github actions(which I still don’t understand). It took me an hour or so before I found something called Probot .

![0_CI-CCyBzOLe4AHAi](https://dev-to-uploads.s3.amazonaws.com/i/35e58rwhxk2oerse396j.png)
 

It is a nice little Node JS module that actually did a lot of heavylifting. We can create a probot app scaffold using npm. It generates all the required files, along with a hello world program which you can start tweaking to understand how things work. To get it working, you need to have installed Node.js. Then you can create the basic scaffold using this.

![0_BMUqdJbNN7kajYbs](https://dev-to-uploads.s3.amazonaws.com/i/9ydcpxx0hdp2dq18eape.png)
 
We see a bunch of files being generated, one of them being index.js
(This is all the code that’s in there !)

The only thing to understand here is how webhooks and context works. Webhooks are continuously listening for any events on the other end. In the above code, it is listening to “issues.opened” event. 

Next comes what context is and how it works. Context is just an awesome abstraction of all the data payload you receive from any event and a gateway to make API requests without having to write any code for API requests. Context has a lot of things that you can access through it. You can find a lost of it here . What I used in this case are the following.

![carbon (2)](https://dev-to-uploads.s3.amazonaws.com/i/yiny9tuiy8xzxvfu4gh6.png)
 
If the webhook receives a trigger due to a pull request, it will receive data only for a pull request in the context, we don’t have to worry about it. Similarly for issues opening closing and other such events. So context.payload contains all the data we may need. Next if we want to post a comment, or publish a label to a PR or an issue, we can use context.github. One thing to note here is Pull Requests are to be treated as Issues when doing stuff common to both, for eg- commenting, labelling, assigning etc. I realised it the hard way after struggling for an hour or two. So I now had to comment on the PR opened, so I treated it like an issue and it worked!!

Next comes labels. It is the same as labels to be added to issues! Easy right?
![carbon (3)](https://dev-to-uploads.s3.amazonaws.com/i/8il17ij01eaxzpnu0nr1.png)
 
One major thing to note here is you won’t find Probot documentation explaining in a lot of detail. You can see the parallel between this context and Octokit though. Do have a look at it though. Had I known that Probot uses Octokit under the hood, and commenting on PR has to be done the same way as issues, things would be over in an hour.

> I wasted time so that you don’t have to.

### Who’s been naughty in PRs?
*Assumptions were made...*

In a fairly active repository, the workflow usually is
1. An issue is opened by maintainers. Interested person interacts with maintainers and gets himself/herself assigned to the issue.
2. If there exists no issue related to the thing someone wants to contribute, they can open one. The flow is then similar to previous point.

The assumptions made were that
1. If someone has not been assigned an issue before, it means they are not entrusted with contributing to the repository by the maintainers.
2. If someone is assigned to any of the open issues, then the maintainers believe that the contributor is genuine and would make genuine contributions, regardless of which issue they end up sending a PR about.

Have a look at this video, you’ll understand better!
{% youtube 0dgPtYPgGP0 %}

This was easy to achieve. 
1. Get a list of all issues on a repository using a public API. For eg https://api.github.com/repos/Chinmay-KB/project-spampr/issues?state=open
2. Get a list of all the assignees to all open issues.
3. See if the username who opened the PR has any of the issues assigned to them.
4. If they are assigned, label the PR as approved, if not send a “personalized” comment out to them.

![Screenshot from 2020-10-09 16-46-25](https://dev-to-uploads.s3.amazonaws.com/i/oizzi88e888bzvz4y7uu.png)
 
That’s as easy as it gets, right?

After that run npm start and the app is running on localhost already!

And here you are, ready to fight spammy PR, one repo at a time. For a few hours at least.
Digital Ocean declared that as of October 3, Hacktoberfest is an opt-in program for repositories. Now not just any PR would be counted as a legit contribution. Either the repository needs to have the hacktoberfest topic or the pull requests should have hacktoberfest-approved labels assigned to them to be counted as a legitimate PR. Sway of the mighty hand you see!

It was good learning for me though, from knowing nothing about Github bots to having deployed one on Heroku, all within 12 hours is quite a learning ! The bot never gained any traction, neither in the MLH hackathon I submitted this or the tweets I had sent out to MLH and Digital Ocean :( 
{% twitter 1312644547369938944 %}
But there’s nothing like learning by doing, right?

Github repo [here](https://github.com/Chinmay-KB/project-spampr)
This project was submitted to MLH Hero Hacks [Devpost link](https://devpost.com/software/project-spampr?ref_content=user-portfolio&ref_feature=in_progress)
