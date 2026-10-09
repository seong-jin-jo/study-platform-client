# PublicProfileControllerApi

All URIs are relative to *https://test-api.zeroone.it.kr*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**getProfileSitemapResources**](#getprofilesitemapresources) | **GET** /api/v1/members/public-profile-sitemap-resources | 공개 프로필 sitemap resource snapshot|
|[**getPublicProfile**](#getpublicprofile) | **GET** /api/v1/members/{profileUuid}/public-profile | 공개 회원 프로필 projection|

# **getProfileSitemapResources**
> BaseResponsePublicProfileSitemapResourceResponse getProfileSitemapResources()


### Example

```typescript
import {
    PublicProfileControllerApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new PublicProfileControllerApi(configuration);

let cursor: string; // (optional) (default to undefined)
let size: number; // (optional) (default to 1000)
let snapshot: string; // (optional) (default to undefined)
let partitionStartExclusive: string; // (optional) (default to undefined)
let partitionEndInclusive: string; // (optional) (default to undefined)

const { status, data } = await apiInstance.getProfileSitemapResources(
    cursor,
    size,
    snapshot,
    partitionStartExclusive,
    partitionEndInclusive
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **cursor** | [**string**] |  | (optional) defaults to undefined|
| **size** | [**number**] |  | (optional) defaults to 1000|
| **snapshot** | [**string**] |  | (optional) defaults to undefined|
| **partitionStartExclusive** | [**string**] |  | (optional) defaults to undefined|
| **partitionEndInclusive** | [**string**] |  | (optional) defaults to undefined|


### Return type

**BaseResponsePublicProfileSitemapResourceResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: */*


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | 서명된 snapshot과 profile resource page |  -  |
|**400** | snapshot/cursor/range 오류 |  -  |
|**409** | dataset watermark 변경으로 snapshot 무효화 |  -  |
|**500** | pagination invariant 위반 |  -  |
|**503** | sitemap dependency 일시 장애 |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getPublicProfile**
> BaseResponsePublicProfileResponse getPublicProfile()

허용된 public profile 필드만 반환

### Example

```typescript
import {
    PublicProfileControllerApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new PublicProfileControllerApi(configuration);

let profileUuid: string; // (default to undefined)
let roomsCursor: string; // (optional) (default to undefined)
let postsCursor: string; // (optional) (default to undefined)
let listSize: number; // (optional) (default to 5)

const { status, data } = await apiInstance.getPublicProfile(
    profileUuid,
    roomsCursor,
    postsCursor,
    listSize
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **profileUuid** | [**string**] |  | defaults to undefined|
| **roomsCursor** | [**string**] |  | (optional) defaults to undefined|
| **postsCursor** | [**string**] |  | (optional) defaults to undefined|
| **listSize** | [**number**] |  | (optional) defaults to 5|


### Return type

**BaseResponsePublicProfileResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: */*


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | 공개 프로필 |  -  |
|**400** | cursor/listSize 형식 오류 |  -  |
|**404** | 공개 가능한 프로필 없음 |  -  |
|**500** | profile projection 무결성 오류 |  -  |
|**503** | 공개 dependency 일시 장애 |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

