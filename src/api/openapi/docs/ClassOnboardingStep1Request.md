# ClassOnboardingStep1Request


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**nickname** | **string** |  | [default to undefined]
**privacyConsent** | **boolean** |  | [default to undefined]
**termsConsent** | **boolean** |  | [default to undefined]
**marketingConsent** | **boolean** |  | [default to undefined]
**vibeCodingExperienceLevel** | **string** |  | [default to undefined]
**profileImageNumber** | **number** | 사용자가 고른 기본 아바타 번호(1~8). 없으면 서버가 랜덤 부여한다. | [optional] [default to undefined]

## Example

```typescript
import { ClassOnboardingStep1Request } from './api';

const instance: ClassOnboardingStep1Request = {
    nickname,
    privacyConsent,
    termsConsent,
    marketingConsent,
    vibeCodingExperienceLevel,
    profileImageNumber,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
