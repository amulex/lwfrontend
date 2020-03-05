Frontend library for LiveWidget project by Amulex Devlegal

## Overall information
There are two exported LiveWidget services: 
* LiveWidgetService - common full-functional way of using LW. 
* LiveWidgetSignals (only for consultants) - reduced-functional class, giving ability only for listening for incoming call. This way can be helpful, if we have separate pages for listening calls and for communicating. 

## before commit to develop or master
* run `npm run lint` and fix all errors
* run `npm run format`

## to publish npm updates:
from `master` branch
* run `npm version patch`
* run `npm publish`
