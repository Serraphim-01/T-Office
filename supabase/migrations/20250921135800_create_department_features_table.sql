create table
  public.department_features (
    department public.department not null,
    feature text not null,
    is_enabled boolean not null default false,
    constraint department_features_pkey primary key (department, feature)
  ) tablespace pg_default;
