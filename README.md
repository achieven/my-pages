This is a my main website from which you can surf into the other websites I built.      
Go to http://achievendar.tk to see it, or http://test.achievendar.tk or http://www.achievendar.tk (all should redirect you to https)if it doesn't work (it could be down due to cost issues, until I decide i'm keeping it on permanently).
Contact me in achievendar@gmail.com if you want to specifically see it live.   


Use this code:
git clone https://github.com/achieven/my-pages.git

To run the website:

Automatically: (nodemon required)  
./my-pages/script/deployLocally

Manually:  
cd my-pages  
npm i  
nodemon  
open browser at http://localhost:5000  

To run tests:

Automatically: (mocha, firefox required)  
./my-pages/script/testLocally

Manually:  
Unit tests:  
mocha test/unitTests/  
Browser tests:  (temporarily with node)   
nodemon  
node test/browserTests/browserTests.js  





The machines are hosted by digital ocean with Ubuntu 16.04.1 x64    
For instuctions in the remote machine, see https://github.com/achieven/how-to-host-in-digital-ocean
