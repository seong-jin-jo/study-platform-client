# CommunityRoomControllerApi

All URIs are relative to *https://test-api.zeroone.it.kr*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**claimOwnership**](#claimownership) | **POST** /api/v1/community/rooms/{roomId}/ownership-claims | |
|[**createRoom**](#createroom) | **POST** /api/v1/community/rooms | |
|[**deleteMembership**](#deletemembership) | **DELETE** /api/v1/community/rooms/{roomId}/members/me | |
|[**getMyRooms**](#getmyrooms) | **GET** /api/v1/community/rooms/me | |
|[**getRoom**](#getroom) | **GET** /api/v1/community/rooms/{roomId} | |
|[**getRooms**](#getrooms) | **GET** /api/v1/community/rooms | |
|[**joinRoom**](#joinroom) | **POST** /api/v1/community/rooms/{roomId}/join | |
|[**leaveRoom**](#leaveroom) | **DELETE** /api/v1/community/rooms/{roomId}/join | |
|[**putMembership**](#putmembership) | **PUT** /api/v1/community/rooms/{roomId}/members/me | |

# **claimOwnership**
> BaseResponseCommunityRoomOwnershipClaimResponse claimOwnership(communityRoomOwnershipClaimRequest)


### Example

```typescript
import {
    CommunityRoomControllerApi,
    Configuration,
    CommunityRoomOwnershipClaimRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new CommunityRoomControllerApi(configuration);

let roomId: number; // (default to undefined)
let communityRoomOwnershipClaimRequest: CommunityRoomOwnershipClaimRequest; //

const { status, data } = await apiInstance.claimOwnership(
    roomId,
    communityRoomOwnershipClaimRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **communityRoomOwnershipClaimRequest** | **CommunityRoomOwnershipClaimRequest**|  | |
| **roomId** | [**number**] |  | defaults to undefined|


### Return type

**BaseResponseCommunityRoomOwnershipClaimResponse**

### Authorization

[bearer](../README.md#bearer)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: */*


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**401** | Bearer Token is invalid or no bearer token |  -  |
|**403** | You are authenticated but not allowed authorization |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **createRoom**
> BaseResponseCreateCommunityRoomResponse createRoom(createCommunityRoomRequest)


### Example

```typescript
import {
    CommunityRoomControllerApi,
    Configuration,
    CreateCommunityRoomRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new CommunityRoomControllerApi(configuration);

let createCommunityRoomRequest: CreateCommunityRoomRequest; //

const { status, data } = await apiInstance.createRoom(
    createCommunityRoomRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **createCommunityRoomRequest** | **CreateCommunityRoomRequest**|  | |


### Return type

**BaseResponseCreateCommunityRoomResponse**

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

# **deleteMembership**
> BaseResponseCommunityRoomMembershipResponse deleteMembership()


### Example

```typescript
import {
    CommunityRoomControllerApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new CommunityRoomControllerApi(configuration);

let roomId: number; // (default to undefined)

const { status, data } = await apiInstance.deleteMembership(
    roomId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **roomId** | [**number**] |  | defaults to undefined|


### Return type

**BaseResponseCommunityRoomMembershipResponse**

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

# **getMyRooms**
> BaseResponseMyCommunityRoomsResponse getMyRooms()


### Example

```typescript
import {
    CommunityRoomControllerApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new CommunityRoomControllerApi(configuration);

const { status, data } = await apiInstance.getMyRooms();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**BaseResponseMyCommunityRoomsResponse**

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

# **getRoom**
> BaseResponseCommunityRoomResponse getRoom()


### Example

```typescript
import {
    CommunityRoomControllerApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new CommunityRoomControllerApi(configuration);

let roomId: number; // (default to undefined)

const { status, data } = await apiInstance.getRoom(
    roomId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **roomId** | [**number**] |  | defaults to undefined|


### Return type

**BaseResponseCommunityRoomResponse**

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

# **getRooms**
> BaseResponseCommunityRoomHubV2Response getRooms()


### Example

```typescript
import {
    CommunityRoomControllerApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new CommunityRoomControllerApi(configuration);

const { status, data } = await apiInstance.getRooms();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**BaseResponseCommunityRoomHubV2Response**

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

# **joinRoom**
> BaseResponseCommunityRoomMembershipResponse joinRoom(joinCommunityRoomRequest)


### Example

```typescript
import {
    CommunityRoomControllerApi,
    Configuration,
    JoinCommunityRoomRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new CommunityRoomControllerApi(configuration);

let roomId: number; // (default to undefined)
let joinCommunityRoomRequest: JoinCommunityRoomRequest; //

const { status, data } = await apiInstance.joinRoom(
    roomId,
    joinCommunityRoomRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **joinCommunityRoomRequest** | **JoinCommunityRoomRequest**|  | |
| **roomId** | [**number**] |  | defaults to undefined|


### Return type

**BaseResponseCommunityRoomMembershipResponse**

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

# **leaveRoom**
> BaseResponseCommunityRoomMembershipResponse leaveRoom()


### Example

```typescript
import {
    CommunityRoomControllerApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new CommunityRoomControllerApi(configuration);

let roomId: number; // (default to undefined)

const { status, data } = await apiInstance.leaveRoom(
    roomId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **roomId** | [**number**] |  | defaults to undefined|


### Return type

**BaseResponseCommunityRoomMembershipResponse**

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

# **putMembership**
> BaseResponseCommunityRoomMembershipResponse putMembership(joinCommunityRoomRequest)


### Example

```typescript
import {
    CommunityRoomControllerApi,
    Configuration,
    JoinCommunityRoomRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new CommunityRoomControllerApi(configuration);

let roomId: number; // (default to undefined)
let joinCommunityRoomRequest: JoinCommunityRoomRequest; //

const { status, data } = await apiInstance.putMembership(
    roomId,
    joinCommunityRoomRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **joinCommunityRoomRequest** | **JoinCommunityRoomRequest**|  | |
| **roomId** | [**number**] |  | defaults to undefined|


### Return type

**BaseResponseCommunityRoomMembershipResponse**

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

