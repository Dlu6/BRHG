import { useSelector } from "react-redux";
import { useMemo } from "react";

const useLicense = () => {
  const { currentLicense, loadingCurrentLicense } = useSelector(
    (state) => state.licenses
  );

  const isLicensed = currentLicense?.licensed ?? false;
  const licenseStatus = currentLicense?.license?.status;

  const features = useMemo(() => {
    const featureData = currentLicense?.license?.license_type?.features;
    if (typeof featureData === "string") {
      try {
        return JSON.parse(featureData);
      } catch (e) {
        console.error("Failed to parse license features JSON:", e);
        return {};
      }
    }
    return featureData ?? {};
  }, [currentLicense]);

  const hasFeature = (featureKey) => {
    // Ensure that the feature is explicitly set to true
    return features[featureKey] === true;
  };

  return {
    isLoading:
      loadingCurrentLicense === "pending" || loadingCurrentLicense === "idle",
    isLicensed,
    license: currentLicense?.license,
    features,
    hasFeature,
    licenseStatus,
  };
};

export default useLicense;
