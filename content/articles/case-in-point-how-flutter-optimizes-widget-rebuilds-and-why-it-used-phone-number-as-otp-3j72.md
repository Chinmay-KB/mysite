---
title: "Case in point : How Flutter optimizes widget rebuilds and why it used phone number as otp"
date: 2021-10-30
tags: "flutter, todayilearned"
canonical: https://dev.to/chinmaykb/case-in-point-how-flutter-optimizes-widget-rebuilds-and-why-it-used-phone-number-as-otp-3j72
cover: https://media2.dev.to/dynamic/image/width=1000,height=420,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.amazonaws.com%2Fuploads%2Farticles%2Fluvj50zpu1u9yewg9itm.jpg
description: "I'm a man of few means, and a developer of even fewer lines of code.  This is my button    class..."
---

I'm a man of few means, and a developer of even fewer lines of code.

This is my button
```dart
class CustomButton extends StatelessWidget {
  const CustomButton({Key? key, required this.title, required this.onTap})
      : super(key: key);

  final String title;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return TextButton(
      onPressed: onTap,
      child: Text(
        title,
      ),
    );
  }
}
```
This is my textfield
```dart
class CustomTextField extends StatelessWidget {
  CustomTextField(
      {Key? key,
      required this.hintText,
      this.fillColor = Colors.grey})
      : super(key: key);

  final String hintText;
  final Color fillColor;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 32),
      child: TextFormField(
        decoration: InputDecoration(
            hintText: hintText, fillColor: fillColor, filled: true),
      ),
    );
  }
}
``` 
... and this is my login screen with avant garde security
```dart
class MyHomePage extends StatefulWidget {
  const MyHomePage({Key? key, required this.title}) : super(key: key);

  final String title;

  @override
  State<MyHomePage> createState() => _MyHomePageState();
}

class _MyHomePageState extends State<MyHomePage> {
  bool showotp = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        mainAxisSize: MainAxisSize.max,
        children: [
          !showotp
              ? CustomTextField(
                  hintText: 'Phone number',
                )
              : CustomTextField(
                  hintText: 'OTP',
                ),
          !showotp
              ? CustomButton(
                  onTap: () => setState(
                    () {
                      showotp = true;
                    },
                  ),
                  title: 'Send OTP',
                )
              : CustomButton(
                  onTap: () => ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('OTP Submitted'))),
                  title: 'Verify OTP',
                )
        ],
      ),
    );
  }
}
```
Looks about fine, right? Go through this gem of a code, and you will have a rough idea of how it will work. You can take it out for a spin on this  [dartpad.dev snippet](https://dartpad.dartlang.org/?id=93af39f39ed30b55021e2db22b5e4a7f&null_safety=true).

### Something isn't right

If you failed to notice, go back and try these steps again. Enter a phone number, press on send otp, and while the textfield changes, the phone number is prefilled in that field. You can see the `otp` hint text once you clear the prefilled number. But why is this behaviour happening?

*Enter Flutter's Sublinear widget tree building*

## Sublinear widget building

A general adage for Flutter is "It's all widgets". For eg, Padding is not a property of a widget but a widget itself. As a result Flutter has to handle a deeply nested widget tree. Traversing this whole tree the usual way will result in bad performance, so Flutter has some tricks up its sleeve to achieve it in sublinear time.

One of these tricks is not visiting the tree if the child has not marked itself as dirty(change of state). This tree **_also_** holds the state of the widget. Now to find which of the widgets is dirty, a tree diff algorithm would be easier, but not necessarily efficient, so Flutter uses its own algotithm of O(N) complexity. Keep in mind that most layout alsorithms you will find are O(n^2) or worse, and a sublinear algorithm is key to achieve a 60fps render in Flutter

>The child list reconciliation algorithm optimizes for the following cases:

> * The old child list is empty.
> * The two lists are identical.
> * There is an insertion or removal of one or more widgets in exactly one place in the list.
> * If each list contains a widget with the same key, the two widgets are matched.
> * Along with keys, the runtime type is also checked at the same level.

In my case, the runtime type was the same, and because there were no keys assigned to the widgets, they were considered to have the same state. So while the widget is switched because of a simple boolean flag, the state of that widget is not. And thus the state of the old widget is imposed on the new one, because the poor thing could not distinguish one from the other :(

The easy fix is to pass each of the textfields a unique key!

Why this felt like a bug to me at first was because we are accustomed to differentiating different objects of same runtime types depending on their instances, and at times by the data they hold. Things get clearer though once we understand why Flutter does the things it does, doesn't it?

![Flutter finding the difference between two widgets](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/85w2ow264psnj4snzaob.png)
 

If there's something more to it that I might have missed, feel free to chime in the comments!