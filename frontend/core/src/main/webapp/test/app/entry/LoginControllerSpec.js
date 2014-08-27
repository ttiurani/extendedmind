/* Copyright 2013-2014 Extended Mind Technologies Oy
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
 'use strict';

describe('LoginController', function() {
  var $controller, $location, $q, $scope;
  var LoginController;
  var AuthenticationService, UserSessionService;

  beforeEach(function() {
    module('em.appTest');

    inject(function(_$controller_, _$q_, _$location_, $rootScope, _AuthenticationService_, _UserSessionService_) {
      $controller = _$controller_;
      $location = _$location_;
      $q = _$q_;
      $scope = $rootScope.$new();
      AuthenticationService = _AuthenticationService_;
      UserSessionService = _UserSessionService_;
    });
    spyOn($location, 'path');
    spyOn($location, 'search');
  });

  it('should not set user email input to readonly', function() {
    LoginController = $controller('LoginController', {
      $scope: $scope
    });
    expect($scope.user.username).toBeUndefined();
    expect($scope.isUserEmailReadOnly).toBe(false);
  });

  it('should get existing email from Web Storage and set user email input to readonly', function() {
    var email = 'example@example.com';
    spyOn(UserSessionService, 'getEmail').andReturn(email);
    LoginController = $controller('LoginController', {
      $scope: $scope
    });
    expect($scope.user.username).toEqual(email);
    expect($scope.isUserEmailReadOnly).toBe(true);
  });

  it('should login user', function() {
    LoginController = $controller('LoginController', {
      $scope: $scope
    });
    $scope.user = {
      username: 'example@example.com',
      password: 'password'
    };
    var deferred = $q.defer();
    var promise = deferred.promise;
    spyOn(AuthenticationService, 'login').andReturn(promise);

    $scope.userLogin();
    deferred.resolve();
    $scope.$apply();

    expect($scope.user.remember).toBeUndefined();
    expect(AuthenticationService.login).toHaveBeenCalledWith($scope.user);
    expect($location.path).toHaveBeenCalledWith('/my');
  });

  it('should goto forgot page with email', function() {
    LoginController = $controller('LoginController', {
      $scope: $scope
    });
    $scope.user.username = 'example@example.com';

    $scope.gotoForgot();

    expect($location.path).toHaveBeenCalledWith('/forgot');
    expect($location.search).toHaveBeenCalledWith({email: $scope.user.username});
  });
});