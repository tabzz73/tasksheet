# TaskSheet 1.0.0-rc.2 Superseded Record

RC2 remains immutable at tag `v1.0.0-rc.2`. Its installer and checksum were not replaced.

RC2 correctly identified and cleared demo provenance, but a fresh installation still started with the Cedar Grove demo workspace. Product-owner validation required a production-first installer and reported that the post-clear Facility Profile was not usable in the intended workflow.

RC3 supersedes RC2 by starting with a blank, directly editable facility and no demo operational data. Fictional demo content is now available only through an explicit Settings action. A UI regression directly edits and saves the fresh Facility Profile.
