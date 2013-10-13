/*global $, angular*/
/*jslint eqeq: true */

( function() {'use strict';

    function userAuthenticate($location, $rootScope, authenticateRequest, userSession, userCookie, userSessionStorage) {
      return {
        authenticate : function() {

          if (userSessionStorage.isUserAuthenticated()) {
            if (!userSession.getCredentials()) {
              userSession.setEncodedCredentials(userSessionStorage.getHttpAuthorizationHeader());
            }
          } else if (userCookie.isUserRemembered()) {

            userSession.setCredentials('token', userCookie.getUserToken());
            userSession.setUserRemembered(true);

            authenticateRequest.login().then(function(authenticateResponse) {
              userSession.setUserSessionData(authenticateResponse);
              $rootScope.$broadcast('event:loginSuccess');
            });

          } else {
            $location.path('/login');
          }
        }
      };
    }


    userAuthenticate.$inject = ['$location', '$rootScope', 'authenticateRequest', 'userSession', 'userCookie', 'userSessionStorage'];
    angular.module('em.services').factory('userAuthenticate', userAuthenticate);

    angular.module('em.services').factory('userSession', ['base64', 'httpBasicAuth', 'userCookie', 'userSessionStorage',
    function(base64, httpBasicAuth, userCookie, userSessionStorage) {

      var rememberMe = false;

      return {
        setUserSessionData : function(authenticateResponse) {

          userSessionStorage.setUserUUID(authenticateResponse.userUUID);

          this.setCredentials('token', authenticateResponse.token);
          userSessionStorage.setHttpAuthorizationHeader(this.getCredentials());

          if (this.getUserRemembered()) {
            userCookie.setUserToken(authenticateResponse.token);
          }

        },
        setCredentials : function(username, password) {
          this.setEncodedCredentials(base64.encode(username + ':' + password));
        },
        setEncodedCredentials : function(userpass) {
          httpBasicAuth.setEncodedCredentials(userpass);
        },
        getCredentials : function() {
          return httpBasicAuth.getCredentials();
        },
        setUserRemembered : function(remember) {
          rememberMe = remember;
        },
        getUserRemembered : function() {
          return rememberMe === true;
        }
      };
    }]);

    angular.module('em.services').factory('authenticateRequest', ['httpRequest', 'userSession',
    function(httpRequest, userSession) {
      return {
        login : function() {

          return httpRequest.post('/api/authenticate', {
            rememberMe : userSession.getUserRemembered()
          }).then(function(authenticateResponse) {
            return authenticateResponse.data;
          });
        }
      };
    }]);

    angular.module('em.services').factory('userCookie', [
    function() {

      return {
        setUserToken : function(token) {
          $.cookie('token', token, {
            expires : 7,
            path : '/'
          });
        },
        getUserToken : function() {
          return $.cookie('token');
        },
        clearUserToken : function() {
          $.removeCookie('token');
        },
        isUserRemembered : function() {
          return $.cookie('token') != null;
        }
      };
    }]);

    angular.module('em.services').factory('userSessionStorage', [
    function() {

      return {
        setHttpAuthorizationHeader : function(authorizationHeader) {
          sessionStorage.setItem('authorizationHeader', authorizationHeader);
        },
        getHttpAuthorizationHeader : function() {
          return sessionStorage.getItem('authorizationHeader');
        },
        clearHttpAuthorizationHeader : function() {
          sessionStorage.removeItem('authorizationHeader');
        },
        setUserUUID : function(userUUID) {
          sessionStorage.setItem('userUUID', userUUID);
        },
        getUserUUID : function() {
          return sessionStorage.getItem('userUUID');
        },
        clearUserUUID : function() {
          sessionStorage.removeItem('userUUID');
        },
        isUserAuthenticated : function() {
          return sessionStorage.getItem('authorizationHeader') != null;
        }
      };
    }]);
  }());
