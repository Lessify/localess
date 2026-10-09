// Test-wide setup, registered via the test builder's `setupFiles` option (angular.json).
//
// Services talk to the server through HttpClient: specs provide `provideHttpClient()` +
// `provideHttpClientTesting()` and assert requests with HttpTestingController, and stub
// `ChangeEventsService` where live queries are involved (see schema.service.spec.ts). No module
// mocks are needed any more — the Firebase SDK mocks that lived here are gone with the SDK.
export {};
