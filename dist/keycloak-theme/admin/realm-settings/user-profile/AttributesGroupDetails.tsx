/* eslint-disable */

// @ts-nocheck

import AttributesGroupForm from "./AttributesGroupForm";
import { UserProfileProvider } from "./UserProfileContext";

const AttributesGroupDetails = () => (
  <UserProfileProvider>
    <AttributesGroupForm />
  </UserProfileProvider>
);

export default AttributesGroupDetails;
