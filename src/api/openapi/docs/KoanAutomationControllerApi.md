# KoanAutomationControllerApi

All URIs are relative to *https://test-api.zeroone.it.kr*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**candidates**](#candidates) | **GET** /api/v1/automation/koan-channel-renders | |
|[**claim**](#claim) | **POST** /api/v1/automation/koan-channel-renders/{renderId}/claim | |
|[**complete1**](#complete1) | **POST** /api/v1/automation/koan-channel-renders/{renderId}/complete | |
|[**fail**](#fail) | **POST** /api/v1/automation/koan-channel-renders/{renderId}/fail | |
|[**intake**](#intake) | **POST** /api/v1/automation/koans/intake | |

# **candidates**
> ApiEnvelopeMapStringObject candidates()


### Example

```typescript
import {
    KoanAutomationControllerApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new KoanAutomationControllerApi(configuration);

let limit: number; // (optional) (default to 50)

const { status, data } = await apiInstance.candidates(
    limit
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **limit** | [**number**] |  | (optional) defaults to 50|


### Return type

**ApiEnvelopeMapStringObject**

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: */*


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **claim**
> ApiEnvelopeMapStringObject claim()


### Example

```typescript
import {
    KoanAutomationControllerApi,
    Configuration,
    ClaimRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new KoanAutomationControllerApi(configuration);

let renderId: number; // (default to undefined)
let claimRequest: ClaimRequest; // (optional)

const { status, data } = await apiInstance.claim(
    renderId,
    claimRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **claimRequest** | **ClaimRequest**|  | |
| **renderId** | [**number**] |  | defaults to undefined|


### Return type

**ApiEnvelopeMapStringObject**

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: */*


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **complete1**
> ApiEnvelopeMapStringObject complete1(leaseRequest)


### Example

```typescript
import {
    KoanAutomationControllerApi,
    Configuration,
    LeaseRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new KoanAutomationControllerApi(configuration);

let renderId: number; // (default to undefined)
let leaseRequest: LeaseRequest; //

const { status, data } = await apiInstance.complete1(
    renderId,
    leaseRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **leaseRequest** | **LeaseRequest**|  | |
| **renderId** | [**number**] |  | defaults to undefined|


### Return type

**ApiEnvelopeMapStringObject**

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: */*


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **fail**
> ApiEnvelopeMapStringObject fail(failRequest)


### Example

```typescript
import {
    KoanAutomationControllerApi,
    Configuration,
    FailRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new KoanAutomationControllerApi(configuration);

let renderId: number; // (default to undefined)
let failRequest: FailRequest; //

const { status, data } = await apiInstance.fail(
    renderId,
    failRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **failRequest** | **FailRequest**|  | |
| **renderId** | [**number**] |  | defaults to undefined|


### Return type

**ApiEnvelopeMapStringObject**

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: */*


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **intake**
> ApiEnvelopeDraftData intake(intakeRequest)


### Example

```typescript
import {
    KoanAutomationControllerApi,
    Configuration,
    IntakeRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new KoanAutomationControllerApi(configuration);

let idempotencyKey: string; // (default to undefined)
let intakeRequest: IntakeRequest; //

const { status, data } = await apiInstance.intake(
    idempotencyKey,
    intakeRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **intakeRequest** | **IntakeRequest**|  | |
| **idempotencyKey** | [**string**] |  | defaults to undefined|


### Return type

**ApiEnvelopeDraftData**

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: */*


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

