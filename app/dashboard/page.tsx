"use client";

import { FormEvent, ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { Header, Footer } from "../components";
import { homes, islands, PropertyRow } from "../../lib/data";
import { formatFeeRate, formatMinorUnits } from "../../lib/pricing";
import { supabase } from "../../lib/supabase";
import "./dashboard.css";
import "./publishing-guide.css";
import "./publishing-static.css";
import "./contract.css";
import "./draft-link.css";
import "./listing-actions.css";
import "./listing-actions-row.css";
import SignaturePad from "./SignaturePad";
import "./signature-pad.css";
import "./request-link.css";
import "./saved-homes.css";

type Profile = {
  id: string;
  role: "tenant" | "owner" | "admin";
  full_name: string | null;
  saved_signature_data: string | null;
};
type RentalRequest = {
  id: string;
  property_id: string;
  tenant_id: string;
  owner_id: string;
  move_in: string;
  move_out: string;
  occupants: number;
  purpose_category: string;
  purpose_details: string;
  permanent_address: string;
  relevant_organisation: string | null;
  status: string;
  created_at: string;
  accommodation_amount: number | null;
  guest_fee_rate: number | null;
  guest_fee_amount: number | null;
  owner_fee_rate: number | null;
  owner_fee_amount: number | null;
  guest_total_amount: number | null;
  owner_net_amount: number | null;
  platform_gross_revenue: number | null;
  currency: string | null;
  payment_processing_cost: number | null;
  payment_status: string;
  payout_status: string;
  scheduled_payout_at: string | null;
  properties?: {
    title: string;
    location: string;
    monthly_rent: number;
    security_deposit: number;
  } | null;
  contracts?: {
    owner_approved_at: string;
    tenant_signed_at: string | null;
    contract_version: string;
    owner_name: string | null;
    tenant_name: string | null;
    owner_signature_data: string | null;
    tenant_signature_data: string | null;
    identity_released: boolean;
  } | null;
};

type VisibleContract = NonNullable<RentalRequest["contracts"]> & {
  rental_request_id: string;
};

type SavedHome = {
  property_id: string;
  created_at: string;
  properties: Pick<
    PropertyRow,
    "id" | "title" | "location" | "monthly_rent" | "image_url"
  > | null;
};

export default function Dashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"tenant" | "owner">("tenant");
  const [listings, setListings] = useState<PropertyRow[]>([]);
  const [requests, setRequests] = useState<RentalRequest[]>([]);
  const [savedHomes, setSavedHomes] = useState<SavedHome[]>([]);
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [island, setIsland] = useState("Gran Canaria");
  const [price, setPrice] = useState("");
  const [deposit, setDeposit] = useState("0");
  const [bed, setBed] = useState("2");
  const [image, setImage] = useState(
    "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1400&q=85",
  );
  const [saved, setSaved] = useState("");

  async function refresh(userId: string, view: "tenant" | "owner") {
    async function attachVisibleContracts(rows: RentalRequest[]) {
      if (!rows.length) return rows;
      const { data: contractData, error: contractError } = await supabase.rpc(
        "get_visible_contracts",
      );
      if (contractError) throw contractError;
      const contracts = new Map(
        ((contractData || []) as VisibleContract[]).map((contract) => [
          contract.rental_request_id,
          contract,
        ]),
      );
      return rows.map((request) => ({
        ...request,
        contracts: contracts.get(request.id) || null,
      }));
    }
    if (view === "owner") {
      const [{ data: propertyData }, { data: requestData }] = await Promise.all(
        [
          supabase
            .from("properties")
            .select("*")
            .eq("owner_id", userId)
            .order("created_at", { ascending: false }),
          supabase
            .from("rental_requests")
            .select(
              "*, properties(title, location, monthly_rent, security_deposit)",
            )
            .eq("owner_id", userId)
            .order("created_at", { ascending: false }),
        ],
      );
      setListings((propertyData || []) as PropertyRow[]);
      setRequests(
        await attachVisibleContracts((requestData || []) as RentalRequest[]),
      );
    } else {
      const [{ data }, { data: savedData, error: savedError }] =
        await Promise.all([
          supabase
            .from("rental_requests")
            .select(
              "*, properties(title, location, monthly_rent, security_deposit)",
            )
            .eq("tenant_id", userId)
            .order("created_at", { ascending: false }),
          supabase
            .from("saved_properties")
            .select(
              "property_id, created_at, properties(id, title, location, monthly_rent, image_url)",
            )
            .eq("user_id", userId)
            .order("created_at", { ascending: false }),
        ]);
      if (savedError) throw savedError;
      setRequests(await attachVisibleContracts((data || []) as RentalRequest[]));
      setSavedHomes((savedData || []) as unknown as SavedHome[]);
    }
  }
  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setEmail(user.email || "");
      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (profileError) {
        setError(profileError.message);
        setLoading(false);
        return;
      }
      const initialMode: "tenant" | "owner" =
        data.role === "owner" || data.role === "admin" ? "owner" : "tenant";
      setProfile(data as Profile);
      setMode(initialMode);
      await refresh(user.id, initialMode);
      setLoading(false);
    }
    load();
  }, []);
  async function switchMode(nextMode: "tenant" | "owner") {
    if (!profile || nextMode === mode) return;
    setMode(nextMode);
    setError("");
    setSaved("");
    setRequests([]);
    await refresh(profile.id, nextMode);
  }

  async function add(event: FormEvent) {
    event.preventDefault();
    if (!profile) return;
    setError("");
    const { error: addError } = await supabase.from("properties").insert({
      owner_id: profile.id,
      title,
      location,
      island,
      monthly_rent: Number(price),
      security_deposit: Number(deposit) || 0,
      bedrooms: Number(bed),
      bathrooms: 1,
      image_url: image,
      description: "Furnished seasonal home listed by an owner.",
      is_published: true,
      minimum_nights: 32,
    });
    if (addError) return setError(addError.message);
    setTitle("");
    setLocation("");
    setPrice("");
    setDeposit("0");
    setSaved("Listing published.");
    await refresh(profile.id, "owner");
  }
  async function importHomes() {
    if (!profile) return;
    setError("");
    const rows = homes.map((home) => ({
      owner_id: profile.id,
      title: home.title,
      description: home.description,
      location: home.location,
      island: home.island,
      monthly_rent: home.price,
      bedrooms: home.bedrooms,
      bathrooms: home.bathrooms,
      image_url: home.image,
      is_published: true,
      minimum_nights: 32,
    }));
    const { error: importError } = await supabase
      .from("properties")
      .insert(rows);
    if (importError) return setError(importError.message);
    setSaved("Starter homes are now live.");
    await refresh(profile.id, "owner");
  }
  async function deleteProperty(property: PropertyRow) {
    if (!profile) return;
    if (!window.confirm(`Delete "${property.title}"? This cannot be undone.`))
      return;
    setError("");
    setSaved("");
    const { error: deleteError } = await supabase
      .from("properties")
      .delete()
      .eq("id", property.id)
      .eq("owner_id", profile.id);
    if (deleteError) {
      setError(
        deleteError.code === "23503"
          ? "This property has rental requests and cannot be deleted. Unpublish it instead."
          : deleteError.message,
      );
      return;
    }
    setSaved("Property deleted.");
    await refresh(profile.id, "owner");
  }
  async function startListing() {
    if (!profile) return;
    setError("");
    const { data, error: createError } = await supabase
      .from("properties")
      .insert({
        owner_id: profile.id,
        title: "Untitled property",
        description: "",
        location: "Add public location",
        island: "Gran Canaria",
        monthly_rent: 1,
        security_deposit: 0,
        bedrooms: 1,
        bathrooms: 1,
        image_url: null,
        is_published: false,
        minimum_nights: 32,
      })
      .select("id")
      .single();
    if (createError) {
      setError(createError.message);
      return;
    }
    window.location.href = `/dashboard/property/${data.id}`;
  }
  async function decide(
    requestId: string,
    status: "approved" | "declined",
    signature = "",
  ) {
    if (!profile) return;
    setError("");
    const { error: updateError } = await supabase.rpc(
      "owner_decide_rental_request",
      {
        p_request_id: requestId,
        p_approve: status === "approved",
        p_note: null,
        p_signature_data: signature || null,
      },
    );
    if (updateError) return setError(updateError.message);
    if (signature && !profile.saved_signature_data)
      setProfile({ ...profile, saved_signature_data: signature });
    await refresh(profile.id, "owner");
  }
  async function accept(requestId: string, signature: string) {
    if (!profile) return;
    setError("");
    const { error: acceptError } = await supabase.rpc(
      "tenant_accept_approved_request",
      { p_request_id: requestId, p_signature_data: signature },
    );
    if (acceptError) return setError(acceptError.message);
    await refresh(profile.id, "tenant");
  }

  if (loading)
    return (
      <>
        <Header />
        <main className="loading">Loading dashboard…</main>
        <Footer />
      </>
    );
  if (!profile)
    return (
      <>
        <Header />
        <main className="simple">
          <h1>Your dashboard</h1>
          <p className="lead">
            Sign in to manage your account and rental requests.
          </p>
          <Link className="pill" href="/login">
            Sign in
          </Link>
          {error && <div className="error">{error}</div>}
        </main>
        <Footer />
      </>
    );
  if (mode === "owner")
    return (
      <OwnerDashboardWithDeposit
        data={{
          profile,
          email,
          error,
          saved,
          listings,
          requests,
          title,
          setTitle,
          location,
          setLocation,
          island,
          setIsland,
          price,
          setPrice,
          deposit,
          setDeposit,
          bed,
          setBed,
          image,
          setImage,
          add,
          decide,
          deleteProperty,
          startListing,
          switchMode,
        }}
      />
    );
  const accountSwitch = (
    <div className="dashboard-switch" aria-label="Choose account view">
      <button className="active">Rent a home</button>
      <button onClick={() => switchMode("owner")}>List your property</button>
    </div>
  );
  if (mode === "tenant")
    return (
      <>
        <Header />
        <main className="page account-page">
          <section className="account-hero">
            <div>
              <p className="eyebrow">YOUR 32+ ACCOUNT</p>
              <h1>
                Welcome back
                {profile.full_name
                  ? `, ${profile.full_name.split(" ")[0]}`
                  : ""}
              </h1>
              <p>Manage your rental journey in one place.</p>
            </div>
            <div className="account-avatar">
              {(profile.full_name || email).charAt(0).toUpperCase()}
            </div>
          </section>
          {accountSwitch}
          {error && <div className="error">{error}</div>}
          <section className="account-overview">
            <article>
              <span>⌂</span>
              <div>
                <strong>{requests.length}</strong>
                <small>Rental request{requests.length === 1 ? "" : "s"}</small>
              </div>
            </article>
            <article>
              <span>✓</span>
              <div>
                <strong>
                  {
                    requests.filter(
                      (request) =>
                        request.status === "approved" ||
                        request.status === "tenant_signed",
                    ).length
                  }
                </strong>
                <small>
                  Approved stay
                  {requests.filter(
                    (request) =>
                      request.status === "approved" ||
                      request.status === "tenant_signed",
                  ).length === 1
                    ? ""
                    : "s"}
                </small>
              </div>
            </article>
            <article>
              <span>♥</span>
              <div>
                <strong>{savedHomes.length}</strong>
                <small>Saved home{savedHomes.length === 1 ? "" : "s"}</small>
              </div>
            </article>
            <Link href="/homes">
              <span>⌕</span>
              <div>
                <strong>Find a home</strong>
                <small>Explore available properties</small>
              </div>
              <b>→</b>
            </Link>
          </section>
          <div className="account-section-title">
            <div>
              <h2>Saved homes</h2>
              <p>Properties you would like to revisit.</p>
            </div>
            <Link href="/homes">Browse homes</Link>
          </div>
          {savedHomes.some((savedHome) => savedHome.properties) ? (
            <section className="saved-homes-grid">
              {savedHomes.map(({ property_id, properties }) =>
                properties ? (
                  <Link key={property_id} href={`/home/${properties.id}`}>
                    <img
                      src={properties.image_url || homes[0].image}
                      alt={`View ${properties.title}`}
                    />
                    <div>
                      <h3>{properties.title}</h3>
                      <p>{properties.location}</p>
                      <strong>
                        €{properties.monthly_rent.toLocaleString()} / month
                      </strong>
                    </div>
                  </Link>
                ) : null,
              )}
            </section>
          ) : (
            <section className="panel account-panel saved-homes-empty">
              <p>Homes you save will appear here.</p>
              <Link className="account-primary" href="/homes">
                Browse homes
              </Link>
            </section>
          )}
          <div className="account-section-title">
            <div>
              <h2>Your rental requests</h2>
              <p>Track every request from submission to approval.</p>
            </div>
            <Link href="/homes">Search homes</Link>
          </div>
          <section className="panel account-panel">
            {requests.length ? (
              requests.map((request) => (
                <RequestCard
                  key={request.id}
                  request={request}
                  viewerName={profile.full_name || email}
                  onAccept={accept}
                />
              ))
            ) : (
              <div className="account-empty">
                <span>⌂</span>
                <h3>No rental requests yet</h3>
                <p>
                  When you find the right home, your requests and their status
                  will appear here.
                </p>
                <Link className="account-primary" href="/homes">
                  Start searching
                </Link>
              </div>
            )}
          </section>
        </main>
        <Footer />
      </>
    );

  return (
    <>
      <Header />
      <main className="page account-page">
        <section className="account-hero">
          <div>
            <p className="eyebrow">YOUR 32+ ACCOUNT</p>
            <h1>
              Welcome back
              {profile.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
            </h1>
            <p>Manage your homes and rental requests.</p>
          </div>
          <div className="account-avatar">
            {(profile.full_name || email).charAt(0).toUpperCase()}
          </div>
        </section>
        {accountSwitch}
        {error && <div className="error">{error}</div>}
        {saved && <div className="notice">{saved}</div>}
        <section className="account-overview">
          <article>
            <span>⌂</span>
            <div>
              <strong>{listings.length}</strong>
              <small>Published home{listings.length === 1 ? "" : "s"}</small>
            </div>
          </article>
          <article>
            <span>☷</span>
            <div>
              <strong>{requests.length}</strong>
              <small>Rental request{requests.length === 1 ? "" : "s"}</small>
            </div>
          </article>
          <article>
            <span>✓</span>
            <div>
              <strong>
                {
                  requests.filter((request) => request.status === "approved")
                    .length
                }
              </strong>
              <small>Awaiting tenant acceptance</small>
            </div>
          </article>
        </section>
        <div className="account-section-title">
          <div>
            <h2>Hosting dashboard</h2>
            <p>Your properties and incoming rental requests.</p>
          </div>
        </div>
        <div className="dashboard-grid account-dashboard-grid">
          <section className="panel account-panel">
            <h2>Your homes</h2>
            {listings.length ? (
              listings.map((home) => (
                <div className="listing-row" key={home.id}>
                  <img src={home.image_url || "/logo.png"} alt="" />
                  <div>
                    <strong>{home.title}</strong>
                    <div className="muted">
                      €{home.monthly_rent.toLocaleString()} / month ·{" "}
                      {home.location}
                    </div>
                    <Link className="card-link" href={`/home/${home.id}`}>
                      View listing →
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="account-empty compact">
                <span>⌂</span>
                <h3>No homes listed yet</h3>
                <p>Add your first furnished seasonal property below.</p>
              </div>
            )}
            <details className="add-listing">
              <summary>
                Add a new property <b>＋</b>
              </summary>
              <form className="form" onSubmit={add}>
                <label>
                  Property title
                  <input
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </label>
                <label>
                  Location
                  <input
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </label>
                <label>
                  Island
                  <select
                    value={island}
                    onChange={(e) => setIsland(e.target.value)}
                  >
                    {islands.slice(1).map((i) => (
                      <option key={i}>{i}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Monthly price
                  <input
                    required
                    type="number"
                    min="1"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                </label>
                <label>
                  Bedrooms
                  <input
                    required
                    type="number"
                    min="1"
                    value={bed}
                    onChange={(e) => setBed(e.target.value)}
                  />
                </label>
                <label>
                  Image URL
                  <input
                    required
                    type="url"
                    value={image}
                    onChange={(e) => setImage(e.target.value)}
                  />
                </label>
                <button className="primary">Publish listing</button>
              </form>
            </details>
          </section>
          <aside className="panel account-panel">
            <h2>Rental requests</h2>
            {requests.length ? (
              requests.map((request) => (
                <RequestCard
                  key={request.id}
                  request={request}
                  owner
                  onDecide={decide}
                />
              ))
            ) : (
              <div className="account-empty compact">
                <span>☷</span>
                <h3>No requests yet</h3>
                <p>New tenant requests will appear here.</p>
              </div>
            )}
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}

function RequestCard({
  request,
  owner = false,
  viewerName,
  ownerSignature,
  onDecide,
  onAccept,
}: {
  request: RentalRequest;
  owner?: boolean;
  viewerName?: string | null;
  ownerSignature?: string | null;
  onDecide?: (
    id: string,
    status: "approved" | "declined",
    signature?: string,
  ) => void;
  onAccept?: (id: string, signature: string) => void;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const [signature, setSignature] = useState("");
  const [showContract, setShowContract] = useState(false);
  const hasContract =
    request.status === "approved" ||
    request.status === "tenant_signed" ||
    request.status === "payment_pending" ||
    request.status === "confirmed";
  return (
    <div className="request-card">
      <Link
        className="request-property-link"
        href={`/home/${request.property_id}`}
      >
        {request.properties?.title || "Seasonal home"}
        <span>→</span>
      </Link>
      <p>
        {europeanDate(request.move_in)} → {europeanDate(request.move_out)} ·{" "}
        {request.occupants} occupant{request.occupants === 1 ? "" : "s"}
      </p>
      <p className="inquiry-date">
        Inquiry sent {europeanDateTime(request.created_at)}
      </p>
      <p>
        <strong>Purpose:</strong> {request.purpose_category}
      </p>
      {request.purpose_details !== "Not required for selected category" && (
        <p>{request.purpose_details}</p>
      )}
      <span className="status">
        {request.status === "tenant_signed"
          ? "Contract signed"
          : request.status.replace("_", " ")}
      </span>
      <BookingFinancialBreakdown request={request} ownerView={owner} />
      {owner && request.status === "submitted" && (
        <div className="acceptance">
          {ownerSignature ? (
            <>
              <p className="form-help">
                Your saved signature will be inserted after you confirm this
                contract.
              </p>
              <img
                className="saved-signature"
                src={ownerSignature}
                alt="Saved owner signature"
              />
            </>
          ) : (
            <SignaturePad
              label="Draw your signature once — it will be saved for future contracts"
              value={signature}
              onChange={setSignature}
            />
          )}
          <label className="check">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            <span>I have reviewed this contract and agree to sign it.</span>
          </label>
          <button
            className="primary-small"
            disabled={!confirmed || (!ownerSignature && !signature)}
            onClick={() => onDecide?.(request.id, "approved", signature)}
          >
            Sign contract and approve
          </button>
          <button onClick={() => onDecide?.(request.id, "declined")}>
            Decline
          </button>
        </div>
      )}
      {hasContract && (
        <button
          className="contract-toggle"
          onClick={() => setShowContract(!showContract)}
        >
          {showContract
            ? "Hide agreement"
            : "View 32+ Seasonal Rental Agreement"}
        </button>
      )}
      {showContract && (
        <ContractAgreement
          request={request}
          viewerName={viewerName}
          ownerView={owner}
        />
      )}{" "}
      {request.status === "approved" && owner && (
        <p className="form-help">
          Approved and recorded. The tenant can now review and accept the draft
          agreement.
        </p>
      )}
      {request.status === "approved" && !owner && (
        <div className="acceptance">
          <SignaturePad
            label="Draw your signature"
            value={signature}
            onChange={setSignature}
          />
          <label className="check">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            <span>
              I have reviewed the approved rental details and the draft
              agreement shown above.
            </span>
          </label>
          <button
            className="primary-small"
            disabled={!confirmed || !signature}
            onClick={() => onAccept?.(request.id, signature)}
          >
            Sign contract and agree
          </button>
          <p className="form-help">
            Electronic acceptance is recorded. The agreement remains a draft
            until the identity, exact address and lawyer-approved final terms
            are complete.
          </p>
        </div>
      )}
      {request.status === "tenant_signed" && (
        <p className="form-help">
          Tenant acceptance recorded
          {request.contracts?.tenant_signed_at
            ? ` on ${europeanDateTime(request.contracts.tenant_signed_at)}`
            : ""}
          . Payment setup is the next step.
        </p>
      )}
    </div>
  );
}

function BookingFinancialBreakdown({
  request,
  ownerView,
}: {
  request: RentalRequest;
  ownerView: boolean;
}) {
  if (
    request.accommodation_amount === null ||
    request.currency === null ||
    request.guest_fee_rate === null ||
    request.guest_fee_amount === null ||
    request.owner_fee_rate === null ||
    request.owner_fee_amount === null ||
    request.guest_total_amount === null ||
    request.owner_net_amount === null
  )
    return null;

  return (
    <section className="booking-financials" aria-label="Booking price">
      <div>
        <span>Accommodation</span>
        <strong>
          {formatMinorUnits(request.accommodation_amount, request.currency)}
        </strong>
      </div>
      {ownerView ? (
        <>
          <div>
            <span>
              32+ service fee ({formatFeeRate(request.owner_fee_rate)})
            </span>
            <strong>
              −{formatMinorUnits(request.owner_fee_amount, request.currency)}
            </strong>
          </div>
          <div className="financial-total">
            <span>Your proceeds</span>
            <strong>
              {formatMinorUnits(request.owner_net_amount, request.currency)}
            </strong>
          </div>
          {request.scheduled_payout_at && (
            <p>
              Scheduled release: {europeanDateTime(request.scheduled_payout_at)}
              <br />
              Payout status: {request.payout_status.replaceAll("_", " ")}
            </p>
          )}
        </>
      ) : (
        <>
          <div>
            <span>
              32+ service fee ({formatFeeRate(request.guest_fee_rate)})
            </span>
            <strong>
              {formatMinorUnits(request.guest_fee_amount, request.currency)}
            </strong>
          </div>
          <div className="financial-total">
            <span>Total</span>
            <strong>
              {formatMinorUnits(request.guest_total_amount, request.currency)}
            </strong>
          </div>
        </>
      )}
    </section>
  );
}

function ContractAgreement({
  request,
  viewerName,
  ownerView,
}: {
  request: RentalRequest;
  viewerName?: string | null;
  ownerView: boolean;
}) {
  const rent = request.properties?.monthly_rent || 0;
  const deposit = request.properties?.security_deposit || 0;
  const landlord =
    request.contracts?.owner_name ||
    (ownerView ? viewerName : null) ||
    "Verified property owner";
  const tenant =
    request.contracts?.tenant_name ||
    (!ownerView ? viewerName : null) ||
    "Verified tenant";
  return (
    <article className="contract-document">
      <header>
        <p>DRAFT · LEGAL REVIEW REQUIRED</p>
        <h2>32+ SEASONAL RENTAL AGREEMENT</h2>
      </header>
      <dl>
        <div>
          <dt>Landlord</dt>
          <dd>{landlord}</dd>
        </div>
        <div>
          <dt>Tenant</dt>
          <dd>{tenant}</dd>
        </div>
        <div>
          <dt>Property</dt>
          <dd>
            {request.properties?.location || "Location pending"} — full address
            pending
          </dd>
        </div>
        <div>
          <dt>Rental period</dt>
          <dd>
            {europeanDate(request.move_in)} to {europeanDate(request.move_out)}
          </dd>
        </div>
        <div>
          <dt>Monthly rent</dt>
          <dd>€{rent.toLocaleString()}</dd>
        </div>
        {deposit > 0 && (
          <div>
            <dt>Security deposit selected by owner</dt>
            <dd>€{deposit.toLocaleString()}</dd>
          </div>
        )}
      </dl>
      {!request.contracts?.identity_released && (
        <p className="contract-privacy-note">
          For booking security, only first names are shared between the parties
          before confirmed payment. Full contractual identities and the other
          party&apos;s signature are released after payment.
        </p>
      )}
      <ContractClause number="1" title="Purpose">
        <p>
          The property is rented on a temporary basis (
          <i>arrendamiento de temporada</i>) and not to satisfy the
          Tenant&apos;s permanent housing needs.
        </p>
        <p>
          <strong>Temporary reason:</strong> {request.purpose_category}
        </p>
        {request.purpose_details !== "Not required for selected category" && (
          <p>
            <strong>Specific reason:</strong> {request.purpose_details}
          </p>
        )}
        <p>
          The Tenant declares that this temporary need is genuine and
          corresponds to the agreed rental period. The parties acknowledge
          that the property is not intended to constitute the Tenant&apos;s
          habitual or permanent residence.
        </p>
      </ContractClause>
      <ContractClause number="2" title="Duration">
        <p>
          The rental begins on <strong>{europeanDate(request.move_in)}</strong>{" "}
          and ends on <strong>{europeanDate(request.move_out)}</strong>, without
          prejudice to any extension expressly agreed between the parties and
          permitted by the 32+ platform booking limits.
        </p>
      </ContractClause>
      <ContractClause number="3" title="Rent">
        <p>
          The Tenant shall pay the agreed rent of{" "}
          <strong>€{rent.toLocaleString()} per month</strong> in accordance with
          the payment terms accepted through 32+.
        </p>
      </ContractClause>
      {deposit > 0 && (
        <ContractClause number="4" title="Security deposit">
          <p>
            The Tenant shall provide the owner-selected security deposit of{" "}
            <strong>€{deposit.toLocaleString()}</strong> in accordance with the
            payment and return conditions included in the final agreement.
          </p>
        </ContractClause>
      )}
      <ContractClause number={deposit > 0 ? "5" : "4"} title="Use">
        <p>
          The property shall be used solely for the stated temporary
          accommodation purpose. The Tenant shall take reasonable care of the
          property and comply with applicable property and community rules.
        </p>
      </ContractClause>
      <ContractClause
        number={deposit > 0 ? "6" : "5"}
        title="Booking conditions"
      >
        <p>
          The property details, payment conditions and other conditions
          expressly accepted by the parties through 32+ form part of this
          agreement.
        </p>
      </ContractClause>
      <ContractClause number={deposit > 0 ? "7" : "6"} title="Legal regime">
        <p>
          This draft is intended as an <i>arrendamiento de temporada</i> under
          Article 3 of Ley 29/1994 de Arrendamientos Urbanos, subject to legal
          review and applicable Spanish and regional law.
        </p>
      </ContractClause>
      <ContractClause
        number={deposit > 0 ? "8" : "7"}
        title="Electronic signature"
      >
        <p>
          Electronic approval and acceptance timestamps are recorded by 32+.
          Final execution requires complete party identification, the exact
          property address and lawyer-approved final wording.
        </p>
      </ContractClause>
      <div className="contract-signatures">
        <div>
          <strong>LANDLORD</strong>
          <span>{landlord}</span>
          {request.contracts?.owner_signature_data && (
            <img
              src={request.contracts.owner_signature_data}
              alt="Landlord signature"
            />
          )}
          <span>
            {request.contracts?.owner_approved_at
              ? europeanDateTime(request.contracts.owner_approved_at)
              : "Approval pending"}
          </span>
          <span>Electronic approval recorded</span>
        </div>
        <div>
          <strong>TENANT</strong>
          <span>{tenant}</span>
          {request.contracts?.tenant_signature_data && (
            <img
              src={request.contracts.tenant_signature_data}
              alt="Tenant signature"
            />
          )}
          <span>
            {request.contracts?.tenant_signed_at
              ? europeanDateTime(request.contracts.tenant_signed_at)
              : "Signature pending"}
          </span>
          <span>
            {request.contracts?.tenant_signed_at
              ? "Electronic acceptance recorded"
              : "Not yet accepted"}
          </span>
        </div>
      </div>
    </article>
  );
}
function ContractClause({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h3>
        {number}. {title}
      </h3>
      {children}
    </section>
  );
}
function OwnerDashboard({ data }: { data: any }) {
  const {
    profile,
    email,
    error,
    saved,
    listings,
    requests,
    title,
    setTitle,
    location,
    setLocation,
    island,
    setIsland,
    price,
    setPrice,
    bed,
    setBed,
    image,
    setImage,
    add,
    decide,
    switchMode,
  } = data;
  return (
    <>
      <Header />
      <main className="page account-page">
        <section className="account-hero">
          <div>
            <p className="eyebrow">YOUR 32+ ACCOUNT</p>
            <h1>
              Welcome back
              {profile.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
            </h1>
            <p>Manage your homes and rental requests.</p>
          </div>
          <div className="account-avatar">
            {(profile.full_name || email).charAt(0).toUpperCase()}
          </div>
        </section>
        <div className="dashboard-switch" aria-label="Choose account view">
          <button onClick={() => switchMode("tenant")}>Rent a home</button>
          <button className="active">List your property</button>
        </div>
        {error && <div className="error">{error}</div>}
        {saved && <div className="notice">{saved}</div>}
        <section className="account-overview">
          <article>
            <span>⌂</span>
            <div>
              <strong>{listings.length}</strong>
              <small>Published home{listings.length === 1 ? "" : "s"}</small>
            </div>
          </article>
          <article>
            <span>☷</span>
            <div>
              <strong>{requests.length}</strong>
              <small>Rental request{requests.length === 1 ? "" : "s"}</small>
            </div>
          </article>
          <article>
            <span>✓</span>
            <div>
              <strong>
                {
                  requests.filter(
                    (request: RentalRequest) => request.status === "approved",
                  ).length
                }
              </strong>
              <small>Awaiting tenant acceptance</small>
            </div>
          </article>
        </section>
        <section className="publish-guide">
          <div className="publish-guide-heading">
            <div>
              <p className="eyebrow">OWNER GUIDE</p>
              <h2>Publishing a new home listing</h2>
              <p>
                Prepare the essentials, review everything carefully, and publish
                when you are ready to receive rental requests.
              </p>
            </div>
            <a href="#add-property">Start a listing →</a>
          </div>
          <div className="publish-steps">
            <article>
              <b>1</b>
              <span>
                <strong>Prepare your listing</strong>
                <small>
                  Title, location, monthly price, bedrooms and a clear main
                  photo.
                </small>
              </span>
            </article>
            <article>
              <b>2</b>
              <span>
                <strong>Complete required details</strong>
                <small>Fill in every required field before publishing.</small>
              </span>
            </article>
            <article>
              <b>3</b>
              <span>
                <strong>Publish when ready</strong>
                <small>
                  Your home becomes available to tenants once published.
                </small>
              </span>
            </article>
            <article>
              <b>4</b>
              <span>
                <strong>Review your live listing</strong>
                <small>Open the property page and check how it appears.</small>
              </span>
            </article>
          </div>
          <div className="publish-note">
            <strong>Before you publish</strong>
            <span>
              Only list a furnished home suitable for genuine temporary stays of
              at least 32 nights. Make sure the information, price and photos
              are accurate.
            </span>
            <Link href="/owners">Read how 32+ works</Link>
          </div>
        </section>
        <div className="account-section-title">
          <div>
            <h2>Hosting dashboard</h2>
            <p>Your properties and incoming rental requests.</p>
          </div>
        </div>
        <div className="dashboard-grid account-dashboard-grid">
          <section id="your-homes" className="panel account-panel">
            <h2>Your homes</h2>
            {listings.length ? (
              listings.map((home: PropertyRow) => (
                <div className="listing-row" key={home.id}>
                  <img src={home.image_url || "/logo.png"} alt="" />
                  <div>
                    <strong>{home.title}</strong>
                    <div className="muted">
                      €{home.monthly_rent.toLocaleString()} / month ·{" "}
                      {home.location}
                    </div>
                    <Link className="card-link" href={`/home/${home.id}`}>
                      View listing →
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="account-empty compact">
                <span>⌂</span>
                <h3>No homes listed yet</h3>
                <p>Add your first furnished seasonal property below.</p>
              </div>
            )}
            <details id="add-property" className="add-listing">
              <summary>
                Add a new property <b>＋</b>
              </summary>
              <div id="listing-requirements" className="listing-requirements">
                <strong>Required to publish</strong>
                <span>
                  Complete every field below. You can review the live property
                  page immediately after publishing.
                </span>
              </div>
              <form className="form" onSubmit={add}>
                <label>
                  Property title
                  <input
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </label>
                <label>
                  Location
                  <input
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </label>
                <label>
                  Island
                  <select
                    value={island}
                    onChange={(e) => setIsland(e.target.value)}
                  >
                    {islands.slice(1).map((i) => (
                      <option key={i}>{i}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Monthly price
                  <input
                    required
                    type="number"
                    min="1"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                </label>
                <label>
                  Bedrooms
                  <input
                    required
                    type="number"
                    min="1"
                    value={bed}
                    onChange={(e) => setBed(e.target.value)}
                  />
                </label>
                <label>
                  Image URL
                  <input
                    required
                    type="url"
                    value={image}
                    onChange={(e) => setImage(e.target.value)}
                  />
                </label>
                <button className="primary">Publish listing</button>
              </form>
            </details>
          </section>
          <aside className="panel account-panel">
            <h2>Rental requests</h2>
            {requests.length ? (
              requests.map((request: RentalRequest) => (
                <RequestCard
                  key={request.id}
                  request={request}
                  owner
                  onDecide={decide}
                />
              ))
            ) : (
              <div className="account-empty compact">
                <span>☷</span>
                <h3>No requests yet</h3>
                <p>New tenant requests will appear here.</p>
              </div>
            )}
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}

function OwnerDashboardWithDeposit({ data }: { data: any }) {
  const {
    profile,
    email,
    error,
    saved,
    listings,
    requests,
    decide,
    deleteProperty,
    startListing,
    switchMode,
  } = data;
  return (
    <>
      <Header />
      <main className="page account-page">
        <section className="account-hero">
          <div>
            <p className="eyebrow">YOUR 32+ ACCOUNT</p>
            <h1>
              Welcome back
              {profile.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
            </h1>
            <p>Manage your homes and rental requests.</p>
          </div>
          <div className="account-avatar">
            {(profile.full_name || email).charAt(0).toUpperCase()}
          </div>
        </section>
        <div className="dashboard-switch" aria-label="Choose account view">
          <button onClick={() => switchMode("tenant")}>Rent a home</button>
          <button className="active">List your property</button>
        </div>
        {error && <div className="error">{error}</div>}
        {saved && <div className="notice">{saved}</div>}
        <section className="account-overview">
          <article>
            <span>⌂</span>
            <div>
              <strong>{listings.length}</strong>
              <small>Published home{listings.length === 1 ? "" : "s"}</small>
            </div>
          </article>
          <article>
            <span>☷</span>
            <div>
              <strong>{requests.length}</strong>
              <small>Rental request{requests.length === 1 ? "" : "s"}</small>
            </div>
          </article>
          <article>
            <span>✓</span>
            <div>
              <strong>
                {
                  requests.filter(
                    (request: RentalRequest) => request.status === "approved",
                  ).length
                }
              </strong>
              <small>Awaiting tenant acceptance</small>
            </div>
          </article>
        </section>
        <section className="publish-guide">
          <div className="publish-guide-heading">
            <div>
              <p className="eyebrow">OWNER GUIDE</p>
              <h2>Publishing a new home listing</h2>
              <p>
                Prepare the essentials, review everything carefully, and publish
                when you are ready to receive rental requests.
              </p>
            </div>
            <button
              type="button"
              className="start-listing-button"
              onClick={startListing}
            >
              Start a listing →
            </button>
          </div>
          <div className="publish-steps">
            <article>
              <b>1</b>
              <span>
                <strong>Prepare your listing</strong>
                <small>
                  Title, location, monthly price, bedrooms and a clear main
                  photo.
                </small>
              </span>
            </article>
            <article>
              <b>2</b>
              <span>
                <strong>Choose your terms</strong>
                <small>
                  Decide whether you require a security deposit and enter the
                  exact amount.
                </small>
              </span>
            </article>
            <article>
              <b>3</b>
              <span>
                <strong>Publish when ready</strong>
                <small>
                  Your home becomes available to tenants once published.
                </small>
              </span>
            </article>
            <article>
              <b>4</b>
              <span>
                <strong>Review your live listing</strong>
                <small>Open the property page and check how it appears.</small>
              </span>
            </article>
          </div>
          <div className="publish-note">
            <strong>Before you publish</strong>
            <span>
              Only list a furnished home suitable for genuine temporary stays of
              at least 32 nights. Make sure the information, price, deposit
              choice and photos are accurate.
            </span>
            <Link href="/owners">Read how 32+ works</Link>
          </div>
        </section>
        <div className="account-section-title">
          <div>
            <h2>Hosting dashboard</h2>
            <p>Your properties and incoming rental requests.</p>
          </div>
        </div>
        <div className="dashboard-grid account-dashboard-grid">
          <section id="your-homes" className="panel account-panel">
            <h2>Your homes</h2>
            {listings.length ? (
              listings.map((home: PropertyRow) => (
                <div className="listing-row" key={home.id}>
                  <img src={home.image_url || "/logo.png"} alt="" />
                  <div>
                    <strong>{home.title}</strong>
                    <div className="muted">
                      €{home.monthly_rent.toLocaleString()} monthly base price ·{" "}
                      {home.security_deposit > 0
                        ? `€${home.security_deposit.toLocaleString()} deposit`
                        : "No deposit"}{" "}
                      · {home.location}
                    </div>
                    <div className="listing-links">
                      <Link className="card-link" href={`/home/${home.id}`}>
                        View listing
                      </Link>
                      <Link
                        className="card-link"
                        href={`/dashboard/property/${home.id}`}
                      >
                        Edit property
                      </Link>
                      <Link
                        className="card-link"
                        href={`/dashboard/calendar/${home.id}`}
                      >
                        Calendar & pricing
                      </Link>
                      <button
                        type="button"
                        className="delete-listing"
                        onClick={() => deleteProperty(home)}
                      >
                        Delete property
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="account-empty compact">
                <span>⌂</span>
                <h3>No homes listed yet</h3>
                <p>Add your first furnished seasonal property below.</p>
              </div>
            )}
          </section>
          <aside className="panel account-panel">
            <h2>Rental requests</h2>
            {requests.length ? (
              requests.map((request: RentalRequest) => (
                <RequestCard
                  key={request.id}
                  request={request}
                  viewerName={profile.full_name || email}
                  owner
                  ownerSignature={profile.saved_signature_data}
                  onDecide={decide}
                />
              ))
            ) : (
              <div className="account-empty compact">
                <span>☷</span>
                <h3>No requests yet</h3>
                <p>New tenant requests will appear here.</p>
              </div>
            )}
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}

function europeanDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}
function europeanDateTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Atlantic/Canary",
  }).format(new Date(value));
}
