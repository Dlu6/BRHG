import React, { useState } from "react";
import {
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Button,
} from "@mui/material";
import { districtOptions } from "./districts";
import { Add, Remove } from "@mui/icons-material";

const ClientFormFields = ({
  formData,
  handleChange,
  handleChangeMulti,
  handleSessionChange,
  sessionList,
  handleSessionAdd,
  handleSessionRemove,
}) => {
  const [isCallerSameAsClient, setIsCallerSameAsClient] = useState(
    formData.sameAsCaller === "Yes"
  );

  const handleCallerChange = (event) => {
    const { name, value } = event.target;
    handleChange(event);
    if (name === "sameAsCaller") {
      setIsCallerSameAsClient(value === "Yes");
    }
  };

  return (
    <Grid container spacing={3}>
      {/* 1. Consent */}
      <Grid item xs={12}>
        <FormControl fullWidth>
          <FormLabel>1. Informed Consent for Online Counseling</FormLabel>
          <TextField
            value={`I would like to let you know that on this counseling helpline, your privacy and confidentiality\nwill be respected, except in cases where there is risk of harm to yourself or others, suspected\nabuse, or when disclosure is required by law. Please note that online counseling may involve\nsome risks, such as technical interruptions or limited non-verbal cues.\n\nYou have the right to ask questions, choose what to share, or withdraw from counseling at any\ntime. While counseling can be helpful, it is not a substitute for emergency services. If you are in\ncrisis, please contact local emergency numbers or crisis hotlines. By continuing, you\nacknowledge that you understand this information and consent to receive online psychological\nsupport from`}
            name="consentV1Text"
            onChange={handleChange}
            fullWidth
            multiline
            rows={6}
            InputProps={{ readOnly: true }}
          />
          <FormControlLabel
            control={
              <Radio
                checked={Boolean(formData.consentV1Accepted)}
                onChange={(e) =>
                  handleChange({
                    target: {
                      name: "consentV1Accepted",
                      value: e.target.checked,
                    },
                  })
                }
              />
            }
            label="Client has read and consented to the above term."
          />
        </FormControl>
      </Grid>

      {/* 2. Case Source */}
      <Grid item xs={12} md={6}>
        <FormControl fullWidth>
          <FormLabel>2. Case Source</FormLabel>
          <RadioGroup
            name="caseSource"
            value={formData.caseSource || ""}
            onChange={handleChange}
          >
            <FormControlLabel
              value="Call-in"
              control={<Radio />}
              label="Call In"
            />
            <FormControlLabel
              value="Walk-in"
              control={<Radio />}
              label="Walk In"
            />
          </RadioGroup>
        </FormControl>
      </Grid>

      {/* 3. Caller's Phone Number */}
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="3. Caller's Phone Number"
          name="mobile"
          value={formData.mobile}
          onChange={handleChange}
          required
          type="number"
          inputProps={{
            inputMode: "numeric",
            pattern: "[0-9]*",
          }}
        />
      </Grid>

      {/* 4. Caller Name */}
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="4. Caller Name"
          name="callerName"
          value={formData.callerName}
          onChange={handleChange}
          required
        />
      </Grid>

      {/* 5. Caller Language */}
      <Grid item xs={12} md={6}>
        <FormControl fullWidth>
          <InputLabel shrink>5. Caller Language</InputLabel>
          <Select
            name="language"
            value={formData.language || ""}
            onChange={handleChange}
            label="5. Caller Language"
          >
            <MenuItem value="English">English</MenuItem>
            <MenuItem value="Luganda">Luganda</MenuItem>
            <MenuItem value="Luo">Luo</MenuItem>
            <MenuItem value="Runyakitara">Runyakitara</MenuItem>
            <MenuItem value="Kiswahili">Kiswahili</MenuItem>
            <MenuItem value="Others">Others</MenuItem>
          </Select>
        </FormControl>
      </Grid>

      {/* 6. Caller Sex */}
      <Grid item xs={12} md={6}>
        <FormControl fullWidth>
          <FormLabel>6. Caller Sex</FormLabel>
          <RadioGroup
            name="callerSex"
            value={formData.callerSex || ""}
            onChange={handleChange}
          >
            <FormControlLabel
              value="female"
              control={<Radio />}
              label="Female"
            />
            <FormControlLabel value="male" control={<Radio />} label="Male" />
            <FormControlLabel
              value="undisclosed"
              control={<Radio />}
              label="Undisclosed"
            />
          </RadioGroup>
        </FormControl>
      </Grid>

      {/* 7. Caller Age */}
      <Grid item xs={12} md={6}>
        <FormControl fullWidth>
          <InputLabel shrink>7. Caller Age</InputLabel>
          <Select
            name="callerAge"
            value={formData.callerAge || ""}
            onChange={handleChange}
            label="7. Caller Age"
          >
            <MenuItem value="Below 18">Below 18</MenuItem>
            <MenuItem value="18-24 Years">18-24 Years</MenuItem>
            <MenuItem value="25-30 Years">25-30 Years</MenuItem>
            <MenuItem value="31-35 Years">31-35 Years</MenuItem>
            <MenuItem value="Above 35 Years">Above 35 Years</MenuItem>
          </Select>
        </FormControl>
      </Grid>

      {/* 8. Is the caller different from the client? */}
      <Grid item xs={12} md={6}>
        <FormControl fullWidth>
          <FormLabel>8. Is the caller different from the client?</FormLabel>
          <RadioGroup
            name="sameAsCaller"
            value={formData.sameAsCaller || ""}
            onChange={handleCallerChange}
          >
            <FormControlLabel value="Yes" control={<Radio />} label="Yes" />
            <FormControlLabel value="No" control={<Radio />} label="No" />
          </RadioGroup>
        </FormControl>
      </Grid>

      {/* Conditionally Render Client Fields */}
      {isCallerSameAsClient && (
        <>
          {/* 9. Relationship between caller and client */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel shrink>9. Relationship</InputLabel>
              <Select
                name="relationship"
                value={formData.relationship || ""}
                onChange={handleChange}
                label="9. Relationship"
              >
                <MenuItem value="Parent(father/mother)">
                  Parent(father/mother)
                </MenuItem>
                <MenuItem value="Spouse">Spouse</MenuItem>
                <MenuItem value="Brother/Sister">Brother/Sister</MenuItem>
                <MenuItem value="Girlfriend/Boyfriend">
                  Girlfriend/Boyfriend
                </MenuItem>
                <MenuItem value="Grandparent(Grandfather/Grandmother)">
                  Grandparent(Grandfather/Grandmother)
                </MenuItem>
                <MenuItem value="Guardian">Guardian</MenuItem>
                <MenuItem value="Peer/Friend">Peer/Friend</MenuItem>
                <MenuItem value="Neighbor">Neighbor</MenuItem>
                <MenuItem value="Teacher">Teacher</MenuItem>
                <MenuItem value="Community Health Worker">
                  Community Health Worker
                </MenuItem>
                <MenuItem value="Workmate">Workmate</MenuItem>
                <MenuItem value="Others">Others</MenuItem>
                <MenuItem value="Not disclosed">Not disclosed</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* 10. Client Name */}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="10. Client Name"
              name="clientName"
              value={formData.clientName}
              onChange={handleChange}
            />
          </Grid>

          {/* 10. Client Sex */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel shrink>Client Sex</InputLabel>
              <Select
                name="clientSex"
                value={formData.clientSex || ""}
                onChange={handleChange}
                label="Client Sex"
              >
                <MenuItem value="female">Female</MenuItem>
                <MenuItem value="male">Male</MenuItem>
                <MenuItem value="undisclosed">Undisclosed</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* 11. Client Age */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel shrink>11. Client Age</InputLabel>
              <Select
                name="clientAge"
                value={formData.clientAge || ""}
                onChange={handleChange}
                label="11. Client Age"
              >
                <MenuItem value="Below 18">Below 18</MenuItem>
                <MenuItem value="18-24 Years">18-24 Years</MenuItem>
                <MenuItem value="25-30 Years">25-30 Years</MenuItem>
                <MenuItem value="31-35 Years">31-35 Years</MenuItem>
                <MenuItem value="Above 35 Years">Above 35 Years</MenuItem>
                <MenuItem value="Not disclosed">Not disclosed</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </>
      )}

      {/* 13. Difficulties */}
      <Grid item xs={12} md={6}>
        <FormControl fullWidth>
          <InputLabel shrink>13. Difficulties</InputLabel>
          <Select
            name="difficulty"
            multiple
            value={formData.difficulty || []}
            onChange={(e) => handleChange(e, "difficulty")}
            label="13. Difficulties"
          >
            <MenuItem value="Anxiety">Anxiety</MenuItem>
            <MenuItem value="Depression">Depression</MenuItem>
            <MenuItem value="Vision - Difficulty Seeing, even if wearing glasses?">
              Vision - Difficulty Seeing, even if wearing glasses?
            </MenuItem>
            <MenuItem value="Hearing - difficulty hearing, even if using a hearing aid(s).">
              Hearing - difficulty hearing, even if using a hearing aid(s)?
            </MenuItem>
            <MenuItem value="Mobility - difficulty walking or climbing steps.">
              Mobility - difficulty walking or climbing steps?
            </MenuItem>
            <MenuItem value="Self-care- difficulty (with self-care such as) washing all over or dressing.">
              Self-care- difficulty (with self-care such as) washing all over or
              dressing?
            </MenuItem>
            <MenuItem value="Communication- difficulty communicating, for example understanding or being understood">
              Communication- difficulty communicating, for example understanding
              or being understood
            </MenuItem>
            <MenuItem value="Cognition (remembering)- difficulty remembering or concentrating.">
              Cognition (remembering)- difficulty remembering or concentrating?
            </MenuItem>
            <MenuItem value="Affect (anxiety and depression)- feeling worried, nervous or anxious">
              Affect (anxiety and depression)- feeling worried, nervous or
              anxious?
            </MenuItem>
            <MenuItem value="Albinism">Albinism</MenuItem>
          </Select>
        </FormControl>
      </Grid>

      {/* 14. Client Nationality */}
      <Grid item xs={12} md={6}>
        <FormControl fullWidth>
          <InputLabel shrink>14. Nationality</InputLabel>
          <Select
            name="nationality"
            value={formData.nationality || ""}
            onChange={handleChange}
            label="14. Nationality"
          >
            <MenuItem value="Ugandan">Ugandan</MenuItem>
            <MenuItem value="Congolese">Congolese</MenuItem>
            <MenuItem value="Rwandese">Rwandese</MenuItem>
            <MenuItem value="Sudanese">Sudanese</MenuItem>
            <MenuItem value="Kenyan">Kenyan</MenuItem>
            <MenuItem value="Somali">Somali</MenuItem>
            <MenuItem value="Tanzanian">Tanzanian</MenuItem>
            <MenuItem value="Others">Others</MenuItem>
          </Select>
        </FormControl>
      </Grid>

      {/* 15. Client Region */}
      <Grid item xs={12} md={6}>
        <FormControl fullWidth>
          <InputLabel shrink>15. Client Region</InputLabel>
          <Select
            name="region"
            value={formData.region || ""}
            onChange={handleChange}
            label="15. Client Region"
          >
            <MenuItem value="Central">Central</MenuItem>
            <MenuItem value="Eastern">Eastern</MenuItem>
            <MenuItem value="Northern">Northern</MenuItem>
            <MenuItem value="Western">Western</MenuItem>
            <MenuItem value="Others">Others</MenuItem>
          </Select>
        </FormControl>
      </Grid>

      {/* 16. Client District */}
      <Grid item xs={12} md={6}>
        <FormControl fullWidth>
          <InputLabel shrink>16. Client District</InputLabel>
          <Select
            name="clientDistrict"
            value={formData.clientDistrict || ""}
            onChange={handleChange}
            label="16. Client District"
          >
            {districtOptions.map((district) => (
              <MenuItem key={district.value} value={district.value}>
                {district.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>

      {/* 17. How did you hear about us? */}
      <Grid item xs={12} md={6}>
        <FormControl fullWidth>
          <InputLabel shrink>17. How did you hear about us?</InputLabel>
          <Select
            name="howDidYouHear"
            multiple
            value={formData.howDidYouHear || []}
            onChange={(e) => handleChange(e, "howDidYouHear")}
            label="17. How did you hear about us?"
          >
            <MenuItem value="Social Media">Social Media</MenuItem>
            <MenuItem value="Marketing campaigns- Television, Radio, Billboards etc,">
              Marketing campaigns- Television, Radio, Billboards etc,
            </MenuItem>
            <MenuItem value="Friend/Colleague,">Friend/Colleague,</MenuItem>
            <MenuItem value="Information, Education, Communication materials- brochures, posters">
              Information, Education, Communication materials- brochures,
              posters
            </MenuItem>
            <MenuItem value="MHU Website">MHU Website</MenuItem>
            <MenuItem value="Referred by Prudential">
              Referred by Prudential
            </MenuItem>
            <MenuItem value="Other">Other</MenuItem>
          </Select>
        </FormControl>
      </Grid>

      {/* 18. Why is the client calling? */}
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="18. Why is the client calling?"
          name="reason"
          value={formData.reason}
          onChange={handleChange}
        />
      </Grid>

      {/* 19. Case category */}
      <Grid item xs={12} md={6}>
        <FormControl fullWidth>
          <InputLabel shrink>19. Case category</InputLabel>
          <Select
            name="accessed"
            multiple
            value={formData.accessed || []}
            onChange={(e) => handleChange(e, "accessed")}
            label="19. Case category"
          >
            <MenuItem value="Seeking Information">Seeking Information</MenuItem>
            <MenuItem value="Seeking Mental Health Treatment">
              Seeking Mental Health Treatment
            </MenuItem>
            <MenuItem value="Legal aid">Legal aid</MenuItem>
            <MenuItem value="Psychosocial Support">
              Psychosocial Support
            </MenuItem>
            <MenuItem value="Peer Support">Peer Support</MenuItem>
            <MenuItem value="Safety & Protection">Safety & Protection</MenuItem>
            <MenuItem value="Livelihood/economic">Livelihood/economic</MenuItem>
            <MenuItem value="School Fees">School Fees</MenuItem>
            <MenuItem value="Rehabilitation">Rehabilitation</MenuItem>
            <MenuItem value="Traditional medicine/Spiritual healing">
              Traditional medicine/Spiritual healing
            </MenuItem>
          </Select>
        </FormControl>
      </Grid>

      {/* 20. Case Assessment */}
      <Grid item xs={12} md={6}>
        <FormControl fullWidth>
          <InputLabel shrink>20. Case Assessment</InputLabel>
          <Select
            name="caseAssessment"
            multiple
            value={formData.caseAssessment || []}
            onChange={(e) => handleChange(e, "caseAssessment")}
            label="20. Case Assessment"
          >
            <MenuItem value="Anxiety">Anxiety</MenuItem>
            <MenuItem value="Autism spectrum disorder">
              Autism spectrum disorder
            </MenuItem>
            <MenuItem value="Bipolar">Bipolar</MenuItem>
            <MenuItem value="Dementia">Dementia</MenuItem>
            <MenuItem value="Depression">Depression</MenuItem>
            <MenuItem value="Eating Disorders">Eating Disorders</MenuItem>
            <MenuItem value="Emotional Related Disorders">
              Emotional Related Disorders
            </MenuItem>
            <MenuItem value="Addiction Related Disorders (alcohol, drugs, gambling, phone, video games)">
              Addiction Related Disorders (alcohol, drugs, gambling, phone,
              video games)
            </MenuItem>
            <MenuItem value="Behavioral and Conduct Disorders (e.g. OCD)">
              Behavioral and Conduct Disorders (e.g. OCD)
            </MenuItem>
            <MenuItem value="Intellectual Disability">
              Intellectual Disability
            </MenuItem>
            <MenuItem value="Personality Disorder">
              Personality Disorder
            </MenuItem>
            <MenuItem value="Physical abuse">Physical abuse</MenuItem>
            <MenuItem value="Post-Traumatic Stress Disorders (PTSD)">
              Post-Traumatic Stress Disorders (PTSD)
            </MenuItem>
            <MenuItem value="Schizophrenia">Schizophrenia</MenuItem>
            <MenuItem value="Self-harm">Self-harm</MenuItem>
            <MenuItem value="Sexual assault/Sexual orientation">
              Sexual assault/Sexual orientation
            </MenuItem>
            <MenuItem value="Sleeping Disorders">Sleeping Disorders</MenuItem>
            <MenuItem value="Stress Related Disorders">
              Stress Related Disorders
            </MenuItem>
            <MenuItem value="Substance use disorder / Alcohol abuse disorder">
              Substance use disorder / Alcohol abuse disorder
            </MenuItem>
            <MenuItem value="Suicidal thoughts">Suicidal thoughts</MenuItem>
            <MenuItem value="Others">Others</MenuItem>
          </Select>
        </FormControl>
      </Grid>

      {/* 21. Duration with condition */}
      <Grid item xs={12} md={6}>
        <FormControl fullWidth>
          <InputLabel shrink>21. Duration with condition</InputLabel>
          <Select
            name="howLong"
            value={formData.howLong || ""}
            onChange={handleChange}
            label="21. Duration with condition"
          >
            <MenuItem value="Less than 2 weeks">Less than 2 weeks</MenuItem>
            <MenuItem value="Two weeks - 1 month">Two weeks - 1 month</MenuItem>
            <MenuItem value="2 - 6 months">2 - 6 months</MenuItem>
            <MenuItem value="7 - 12 months">7 - 12 months</MenuItem>
            <MenuItem value="More than 12 Months">More than 12 Months</MenuItem>
          </Select>
        </FormControl>
      </Grid>

      {/* 22. Prior Services */}
      <Grid item xs={12} md={6}>
        <FormControl fullWidth>
          <InputLabel shrink>22. Prior Services</InputLabel>
          <Select
            name="servicesPrior"
            multiple
            value={formData.servicesPrior || []}
            onChange={(e) => handleChange(e, "servicesPrior")}
            label="22. Prior Services"
          >
            <MenuItem value="None">None</MenuItem>
            <MenuItem value="Mental Health Treatment">
              Mental Health Treatment
            </MenuItem>
            <MenuItem value="Psychosocial Support">
              Psychosocial Support
            </MenuItem>
            <MenuItem value="Rehabilitation">Rehabilitation</MenuItem>
            <MenuItem value="Legal Services">Legal Services</MenuItem>
            <MenuItem value="Safety & Protection Services">
              Safety & Protection Services
            </MenuItem>
            <MenuItem value="Livelihood/Economic empowerment">
              Livelihood/Economic empowerment
            </MenuItem>
            <MenuItem value="Information on mental health">
              Information on mental health
            </MenuItem>
            <MenuItem value="Peer support">Peer support</MenuItem>
            <MenuItem value="Traditional Medicine / Spiritual Healing">
              Traditional Medicine / Spiritual Healing
            </MenuItem>
            <MenuItem value="Prayer from religious leaders">
              Prayer from religious leaders
            </MenuItem>
            <MenuItem value="Others">Others</MenuItem>
          </Select>
        </FormControl>
      </Grid>

      {/* 23. Services Provided */}
      <Grid item xs={12} md={6}>
        <FormControl fullWidth>
          <InputLabel shrink>23. Services Provided</InputLabel>
          <Select
            name="servicesOffered"
            multiple
            value={formData.servicesOffered || []}
            onChange={(e) => handleChange(e, "servicesOffered")}
            label="23. Services Provided"
          >
            <MenuItem value="Psychosocial support/Counselling">
              Psychosocial support/Counselling
            </MenuItem>
            <MenuItem value="Referral">Referral</MenuItem>
            <MenuItem value="Information">Information</MenuItem>
            <MenuItem value="Other">Other</MenuItem>
          </Select>
        </FormControl>
      </Grid>

      {/* 24. Remarks */}
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="24. Remarks"
          name="message"
          value={formData.message}
          onChange={handleChange}
          multiline
          rows={4}
        />
      </Grid>

      {/* 25. Peer Referral */}
      <Grid item xs={12} md={6}>
        <FormControl fullWidth>
          <FormLabel>25. Peer Referral</FormLabel>
          <RadioGroup
            name="peerReferral"
            value={formData.peerReferral || ""}
            onChange={handleChange}
          >
            <FormControlLabel value="Yes" control={<Radio />} label="Yes" />
            <FormControlLabel value="No" control={<Radio />} label="No" />
          </RadioGroup>
        </FormControl>
      </Grid>

      {/* 26. Sessions */}
      <Grid item xs={12}>
        <FormControl fullWidth>
          <FormLabel sx={{ mb: 2 }}>26. Sessions</FormLabel>
          {sessionList.map((session, index) => (
            <Grid container spacing={2} key={index} sx={{ mb: 2 }}>
              <Grid item xs={10}>
                <TextField
                  fullWidth
                  label={`Session ${index + 1}`}
                  name="session"
                  value={session.session}
                  onChange={(e) => handleSessionChange(e, index)}
                  multiline
                  rows={3}
                />
              </Grid>
              <Grid item xs={2}>
                <Button
                  onClick={() => handleSessionRemove(index)}
                  style={{
                    borderRadius: "16px",
                    borderColor: "secondary.main",
                    color: "secondary.main",
                    fontSize: "10px",
                    // Shadow
                    boxShadow: "0px 0px 6px 0px rgba(204, 3, 3, 0.6)",
                  }}
                  variant="outlined"
                  color="secondary"
                  startIcon={<Remove />}
                >
                  Remove
                </Button>
              </Grid>
            </Grid>
          ))}
          <Button
            variant="contained"
            color="primary"
            onClick={handleSessionAdd}
            sx={{ mt: 1, mb: 2 }}
            startIcon={<Add />}
            style={{
              borderRadius: "20px",
              borderColor: "primary.main",
              color: "primary.main",
              width: "fit-content",
              fontSize: "10px",
            }}
          >
            Add Session
          </Button>
        </FormControl>
      </Grid>

      {/* 27. Consent for Feedback Collection */}
      <Grid item xs={12}>
        <FormControl fullWidth>
          <FormLabel>27. Consent for Feedback Collection</FormLabel>
          <TextField
            value={`Consent for Feedback Collection\nWe will be contacting clients as part of a mid-term feedback review on their experiences with the\nonline counseling system. Would it be okay for us to contact you for this purpose? Participation\nis completely voluntary, and you may choose to provide feedback now or at a later time that is\nconvenient for you.\n\nAll information you share will be kept confidential and used only to improve the counseling\nservices. Your decision to participate or not will not affect your access to support in any way. By\nagreeing, you acknowledge that you understand this information and consent to be contacted for\nthe mid-term review.`}
            name="feedbackConsentText"
            onChange={handleChange}
            fullWidth
            multiline
            rows={6}
            InputProps={{ readOnly: true }}
          />
          <FormControlLabel
            control={
              <Radio
                checked={Boolean(formData.feedbackConsentAccepted)}
                onChange={(e) =>
                  handleChange({
                    target: {
                      name: "feedbackConsentAccepted",
                      value: e.target.checked,
                    },
                  })
                }
              />
            }
            label="Client has consented to mid-term feedback contact."
          />
        </FormControl>
      </Grid>
    </Grid>
  );
};

export default ClientFormFields;
