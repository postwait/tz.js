This is tz.js
=============

This supports all normal UNIX timezones.  It provides Date() compatible
Javascript objects to move to and from various timezones.

This software is Copyright (c) 2010 OmniTI Computer Consulting, Inc.

It is released under an MIT license.

Use
===

<script> include the tz.js file and place the zoneinfo directory relative
to it.  zoneinfo info is loaded on-demand by the client.

TZ.date(<timezone>, epoch_ms)

TZ.date(<timezone>, year, month, day, ...) // Same as Date() constructor

Example timezones are: 'US/Pacific', 'GMT', 'Libya'

Legal
====

Copyright OmniTI Computer Consulting, Inc. All rights reserved.
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to
deal in the Software without restriction, including without limitation the
rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
sell copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
IN THE SOFTWARE.
