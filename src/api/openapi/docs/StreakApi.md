# StreakApi

All URIs are relative to *https://test-api.zeroone.it.kr*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**getMyStreak**](#getmystreak) | **GET** /api/v1/streak/me | |

# **getMyStreak**
> BaseResponseStreakStatusResponse getMyStreak()


### Example

```typescript
import {
    StreakApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new StreakApi(configuration);

const { status, data } = await apiInstance.getMyStreak();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**BaseResponseStreakStatusResponse**

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: */*


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**401** | Bearer Token is invalid or no bearer token |  -  |
|**403** | You are authenticated but not allowed authorization |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

