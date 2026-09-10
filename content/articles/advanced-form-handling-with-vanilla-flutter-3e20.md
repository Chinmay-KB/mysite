---
title: "Advanced form handling with vanilla Flutter"
date: 2022-03-26
tags: "flutter, forms, tutorial, mobile"
canonical: https://dev.to/chinmaykb/advanced-form-handling-with-vanilla-flutter-3e20
cover: https://media2.dev.to/dynamic/image/width=1000,height=420,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.amazonaws.com%2Fuploads%2Farticles%2Fm2123ooh49hrtuh5g7ga.jpg
description: "Disclaimer: This article goes about implementing features in a highly opinionated manner, which may..."
---

Disclaimer: This article goes about implementing features in a highly opinionated manner, which may not be in line with many of the tutorials out there. So have an open mind and read along! Cheerio :)

One of the things every front-end developer has to face, regardless of their product type, is to handle form inputs. Designing a form and handling its inputs have never been an exciting prospect for a developer, especially when they have to handle the UI, validation, data on submission, input formatting all at once. Luckily there are some tricks in Flutter we can use to make handling form fills a little 
bit easier. This article will cover 4 broad aspects of forms

- Prefilling/Storing data
- Input formatting
- Validation
- Custom form field

For this tutorial we will be making a simple form to create a new profile. This will include text fields to enter name, mobile number, postal code and upload an image. The behavior for each field will be as follows

| Text field    | Data type | Input format    | Validation                |
| ------------- | --------- | --------------- | ------------------------- |
| Name          | String    | Alphabets only  | Name != empty             |
| Mobile no     | String    | Numbers only    | Length ==10, only numbers |
| Profile Image | File      | Image(jpg, png) | File !=empty              |

Setting up the project

Let’s create a new flutter proiect and then clean up the `main.dart` file to the following code below.

```dart
import 'package:flutter/material.dart';
void main() {
  runApp(const MyApp());
}
class MyApp extends StatelessWidget {
  const MyApp({Key? key}) : super(key: key);
  @override
  Widget build(BuildContext context) {
    // ignore: prefer_const_constructors
    return MaterialApp(
      title: 'Better Flutter Form Demo',
      home: FormPage(),
    );
  }
}
class FormPage extends StatelessWidget {
  FormPage({Key? key}) : super(key: key);
  final _formKey = GlobalKey<FormState>();
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Better Flutter Forms'),
      ),
      body: Form(
        key: _formKey,
        child: Column(
          children: [],
        ),
      ),
    );
  }
}
```

It is always a good idea to make the widgets as modular as possible, so we will be making a custom widget which will handle all our text input, a `CustomTextField`. Create a file `custom_text_field.dart` and add the following code.
```dart
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
class CustomTextField extends StatefulWidget {
  CustomTextField(
      {Key? key})
      : super(key: key);
  @override
  State<CustomTextField> createState() => _CustomTextFieldState();
}
class _CustomTextFieldState extends State<CustomTextField> {
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(8.0),
      child: TextFormField(),
    );
  }
}
```

We will go on adding whatever properties we require to our custom widget and use it in the form.


## Prefilling/Storing data

Prefilling text in a textfield or getting current data of a textfield is usually done using a TextEditingController. But this does not scale well when dealing with multiple controllers in a form. A much easier way to deal with flow of data is to use a model class object to handle everything. Let us create a class for our data in this form.
```dart
import 'dart:io';
class Profile {
  Profile(
      {required this.name, required this.phoneNo, required this.profilePic});
  String? name;
  String? phoneNo;
  File? profilePic;
  Profile copyWith({String? name, String? phoneNo, File? profilePic}) =>
      Profile(
          name: name ?? this.name,
          phoneNo: phoneNo ?? this.phoneNo,
          profilePic: profilePic ?? this.profilePic);
}
```

`TextFormfield` has a built-in property called `initialValue` which when not null prefills the text field with the data passed. It also has a callback called `onChange` which is fired everytime user inputs something in the text field. To expose these functioality from our `CustomTextField`, we add the following properties to it.
```dart
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
class CustomTextField extends StatefulWidget {
  CustomTextField(
      {Key? key,
      required this.hintText,
      required this.initialValue,
      required this.onChanged,})
      : super(key: key);
  final String? initialValue;
  final Function(String) onChanged;
  final String hintText;
  @override
  State<CustomTextField> createState() => _CustomTextFieldState();
}
class _CustomTextFieldState extends State<CustomTextField> {
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(8.0),
      child: TextFormField(
        initialValue: widget.initialValue,
        onChanged: widget.onChanged,
        decoration: InputDecoration(
          hintText: widget.hintText,
        ),
      ),
    );
  }
}
```
We add the name and phone no fields to our form.
```dart
class FormPage extends StatelessWidget {
  FormPage({Key? key, Profile? profile})
      : _profile = profile ?? Profile(),
        super(key: key);
  final _formKey = GlobalKey<FormState>();
  Profile _profile;
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Better Flutter Forms'),
      ),
      body: Form(
        key: _formKey,
        child: Column(
          children: [
            CustomTextField(
              hintText: 'Name',
              initialValue: _profile.name,
              onChanged: (value) => _profile.name = value,
            ),
            CustomTextField(
              hintText: 'Phone No',
              initialValue: _profile.phoneNo,
              onChanged: (value) => _profile.phoneNo = value,
            )
          ],
        ),
      ),
    );
  }
}
```
You can see the data being prefilled in the images below.

![All fields filled up](https://paper-attachments.dropbox.com/s_2175C51C02237583F97CB6E1427A4F933C233FBE7293BF99F30C98ECF2FF4CF8_1643195136213_image.png)

![None of the fields filled up](https://paper-attachments.dropbox.com/s_2175C51C02237583F97CB6E1427A4F933C233FBE7293BF99F30C98ECF2FF4CF8_1643195158675_image.png)

![Available data is prefilled](https://paper-attachments.dropbox.com/s_2175C51C02237583F97CB6E1427A4F933C233FBE7293BF99F30C98ECF2FF4CF8_1643195098752_image.png)


As seen in the example, the text field will now prefill form data depending on whether it has been passed the data or not, doesn’t matter how many fields there are! Had we used controller for each text field, we would have to take care of each prefill, which does not scale properly. Similarly all the data changes are neatly stored in `_profile` .


## Input formatting

Taking in improper inputs from a form and processing it can cause a lot of problems. While they can always be checked for before submission, a better UX would be to let the user not make that mistake while entering itself. We use a property called `inputFormatters` for that. It allows or rejects user input depending on the RegEx pattern we pass it. Another parameter that will come handy is an input length. Let us add these two properties to our `CustomTextField`. Also while we are at it, let’s add some decoration to make the UI look decent!
```dart
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
class CustomTextField extends StatefulWidget {
  CustomTextField(
      {Key? key,
      required this.hintText,
      required this.initialValue,
      required this.onChanged,
      this.inputFormatters,
      this.maxLength})
      : super(key: key);
  final String? initialValue;
  final Function(String) onChanged;
  final String hintText;
  final List<TextInputFormatter>? inputFormatters;
  final int? maxLength;

  @override
  State<CustomTextField> createState() => _CustomTextFieldState();
}
class _CustomTextFieldState extends State<CustomTextField> {
  final _borderStyle = OutlineInputBorder(
      borderSide: const BorderSide(
        color: Color(0xfffafafa),
      ),
      borderRadius: BorderRadius.circular(8));

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(8.0),
      child: TextFormField(
        initialValue: widget.initialValue,
        onChanged: widget.onChanged,
        maxLength: widget.maxLength,
        inputFormatters: widget.inputFormatters,
        validator: widget.validator,
        decoration: InputDecoration(
          fillColor: Colors.grey.withOpacity(0.1),
          filled: true,
          enabledBorder: _borderStyle,
          focusedBorder: _borderStyle,
          hintText: widget.hintText,
          contentPadding:
              const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
        ),
      ),
    );
  }
}
```

In case of name, we only want alphabets and space to be allowed. For this we will be using a predefined input formatters called `FilteringTextInputFormatter`. This has two methods which take in a RegExp as an input, `allow()` and `deny()` , which can used depending on your filtering strategy. Here we want to allow only alphabets and spaces, and the RegExp for that is
`[a-zA-Z]+|\s` . So we will implement this by passing the following to our name field.
```dart
CustomTextField(
              hintText: 'Name',
              initialValue: _profile.name,
              onChanged: (value) => _profile.name = value,
              inputFormatters: [
                FilteringTextInputFormatter.allow(
                  RegExp(r"[a-zA-Z]+|\s"),
                )
              ],
            ),
```
*(Note : Writing a string like this, `r``"``some string``"` means that we are declaring it as a raw string, meaning that they will be treated as the character they are visible. No string interpolations will work inside a raw string and no characters which usually need to be escaped will require escaping anymore, which makes it useful while working with RegExp patterns).*

Now when we try typing in our name field, the only input accepted are alphabets and space!

The same can be applied for number field by using an inbuilt method called `FilteringTextInputFormatter.digitsOnly`. Also we need to fix the input length in phone field, so we pass a `maxLength` of 10.


## Validators

These are callbacks fired when a form is validated. These functions receive the latest values in the field, and if any string is returned from these functions, then it is understood that the input in that particular field is invalid, and the string returned is the error text. In our custom widget, we implement a validator. After adding a validator callback, our `CustomTextField` widget looks like this
```dart
class CustomTextField extends StatefulWidget {
  CustomTextField(
      {Key? key,
      required this.hintText,
      required this.initialValue,
      required this.onChanged,
      this.inputFormatters,
      this.validator,
      this.maxLength})
      : super(key: key);
  final String? initialValue;
  final Function(String) onChanged;
  final String hintText;
  final List<TextInputFormatter>? inputFormatters;
  final int? maxLength;
  final String? Function(String?)? validator;
  @override
  State<CustomTextField> createState() => _CustomTextFieldState();
}
class _CustomTextFieldState extends State<CustomTextField> {
  final _focusNode = FocusNode();
  final _borderStyle = OutlineInputBorder(
      borderSide: const BorderSide(
        color: Color(0xfffafafa),
      ),
      borderRadius: BorderRadius.circular(8));

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(8.0),
      child: TextFormField(
        initialValue: widget.initialValue,
        onChanged: widget.onChanged,
        maxLength: widget.maxLength,
        inputFormatters: widget.inputFormatters,
        validator: widget.validator,
        decoration: InputDecoration(
          fillColor: Colors.grey.withOpacity(0.1),
          filled: true,
          enabledBorder: _borderStyle,
          focusedBorder: _borderStyle,
          hintText: widget.hintText,
          contentPadding:
              const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
        ),
      ),
    );
  }
}
```

In the name field, we can check for validity in the following manner
```dart
CustomTextField(
              hintText: 'Name',
              initialValue: _profile.name,
              onChanged: (value) => _profile.name = value,
              inputFormatters: [
                FilteringTextInputFormatter.allow(
                  RegExp(r"[a-zA-Z]+|\s"),
                )
              ],
              validator: (val) {
                if (val == null || val.isEmpty) {
                  return 'Enter a valid String';
                }
              },
            ),
```
 When no error message is returned from the validator function, it means the input is valid.


{% youtube CAHg1xp7DvA %}

While validation is working fine here, but here we have to press the submit button for validation to kick in. What if a user has not typed their full phone number and moved to type their name, the error message should pop up right then to complete the number, that would be good UX too! For that we have a property called `autoValidateMode` in the `TextFormField`. Setting it to `autovalidateMode: AutovalidateMode.onUserInteraction` means that validation for a field will kick in the moment user changes their focus to any other field.

![Autovalidate mode in action](https://www.dropbox.com/s/xqclucrraxzmtk4/Screen%20Recording%202022-01-27%20at%201.02.22%20AM.gif?dl=0)


Something’s wrong here, right? Validation fires up on user interaction, just how its name suggests, but we want it to fire once user focuses on another field. For that we will be using a `FocusNode`. We declare a `FocusNode` object inside the `CustomTextField` and assign it to the `TextFormField`. Now all we have to do is disable the validator when the field is in focus. We also will have to call `setState()` when focus changes, otherwise the error message won’t be shown on focus change by itself.
```dart
class CustomTextField extends StatefulWidget {
  CustomTextField(
      {Key? key,
      required this.hintText,
      required this.initialValue,
      required this.onChanged,
      this.inputFormatters,
      this.validator,
      this.maxLength})
      : super(key: key);
  final String? initialValue;
  final Function(String) onChanged;
  final String hintText;
  final List<TextInputFormatter>? inputFormatters;
  final int? maxLength;
  final String? Function(String?)? validator;
  @override
  State<CustomTextField> createState() => _CustomTextFieldState();
}
class _CustomTextFieldState extends State<CustomTextField> {
  final _focusNode = FocusNode();
  final _borderStyle = OutlineInputBorder(
      borderSide: const BorderSide(
        color: Color(0xfffafafa),
      ),
      borderRadius: BorderRadius.circular(8));
  @override
  void initState() {
    super.initState();
    _focusNode.addListener(() {
      if (!_focusNode.hasFocus) setState(() {});
    });
  }
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(8.0),
      child: TextFormField(
        focusNode: _focusNode,
        initialValue: widget.initialValue,
        onChanged: widget.onChanged,
        maxLength: widget.maxLength,
        inputFormatters: widget.inputFormatters,
        validator: (value) {
          if (_focusNode.hasFocus) {
            return null;
          } else {
            return widget.validator?.call(value);
          }
        },
        autovalidateMode: AutovalidateMode.onUserInteraction,
        decoration: InputDecoration(
          fillColor: Colors.grey.withOpacity(0.1),
          filled: true,
          enabledBorder: _borderStyle,
          focusedBorder: _borderStyle,
          hintText: widget.hintText,
          contentPadding:
              const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
        ),
      ),
    );
  }
}
```
{% youtube mc4d51iejeU %}
Now that looks like polished UX, with just a few lines of code! This behavior will be default for all `CustomTextField` widgets.


### Custom Form field

What makes a form widget differentiate from other widget is the data validation part. Usually developers may tend to take the easy route and validate any custom field separately, for eg - an image upload field, but that would not scale in case of a complex form. We will be making our own `CustomImageFormField`! Create a `custom_image_form_field.dart` and add the following code.
```dart
import 'dart:io';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
class CustomImageFormField extends StatelessWidget {
  CustomImageFormField({
    Key? key,
    required this.initialValue,
    required this.validator,
    required this.onPicked,
  }) : super(key: key);
  final File? initialValue;
  final String? Function(File?) validator;
  final Function(File) onPicked;
  File? _pickedFile;
  @override
  Widget build(BuildContext context) {
    return FormField(
        initialValue: initialValue,
        validator: (_) => validator.call(_pickedFile),
        builder: (formFieldState) {
          return Column(
            children: [
              GestureDetector(
                onTap: () async {
                  FilePickerResult? file = await FilePicker.platform
                      .pickFiles(type: FileType.image, allowMultiple: false);
                  if (file != null) {
                    _pickedFile = File(file.files.first.path!);
                    onPicked.call(_pickedFile!);
                  }
                },
                child: Container(
                  margin: const EdgeInsets.all(8),
                  padding:
                      const EdgeInsets.symmetric(horizontal: 32, vertical: 8),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(8),
                    color: const Color(0xff707070).withOpacity(0.1),
                  ),
                  child: Column(
                    children: const [
                      Icon(Icons.upload_file),
                      Text('Upload profile picture')
                    ],
                  ),
                ),
              ),
              if (formFieldState.hasError)
                Padding(
                  padding: const EdgeInsets.only(left: 8, top: 10),
                  child: Text(
                    formFieldState.errorText!,
                    style: TextStyle(
                        fontStyle: FontStyle.normal,
                        fontSize: 13,
                        color: Colors.red[700],
                        height: 0.5),
                  ),
                )
            ],
          );
        });
  }
}
```

To make our own form field, we can design the UI in any way we want and justwrap it in a `FormField`. It has all the usual properties like validator and initial value. To pick up image, `file_picker` package was used. Depending on whether this field has an error or not, a widget is conditionally shown. Now when we make a bad submission, we get this kind of error.

![](https://paper-attachments.dropbox.com/s_2175C51C02237583F97CB6E1427A4F933C233FBE7293BF99F30C98ECF2FF4CF8_1643229176867_image.png)


`FormField` widget can be used to make form fields for a variety of uncommon inputs like file picker, date picker, radio buttons etc.
If we pass the `Profile` object in which we have saved all data to another screen and display the data, we see the following.
{% youtube Sdtg7OLEKvc %}

In this tutorial we learnt about how to handle prefilling and saving data, formatting our inputs, validating with a good UX flow, and making our own form field, all without using any third party form handling packages. All these things, when coupled together are enough to handle most of the forms.
